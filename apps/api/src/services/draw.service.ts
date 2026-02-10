import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import {
  Draw,
  DrawTemplate,
  DrawContract,
  DrawStatus,
  WalletMode,
  DRAW_FEE_PERCENT,
  COUNTDOWN_SECONDS,
  CREDITS_PER_USDC,
  DEMO_INITIAL_CREDITS,
  generateSeed,
  computeCommitHash,
  selectWinnerIndex,
  creditsToUSDC,
} from '@sortyapp/shared';
import { ddb, tables } from '../lib/dynamo';
import { AppError } from '../middleware/error.middleware';
import { walletService } from './wallet.service';
import { emailService } from './email.service';
import { userService } from './user.service';

// In-memory countdown timers (local dev). In production, use EventBridge.
const countdownTimers = new Map<string, NodeJS.Timeout>();

// Module-level cache for demo bots (persists across warm Lambda invocations)
let cachedDemoBots: any[] | null = null;
let demoBotsCachedAt = 0;
const DEMO_BOT_CACHE_TTL_MS = 5 * 60 * 1000;

async function getDemoBotsCached(): Promise<any[]> {
  const now = Date.now();
  if (cachedDemoBots && now - demoBotsCachedAt < DEMO_BOT_CACHE_TTL_MS) {
    return cachedDemoBots;
  }
  const result = await ddb.send(new ScanCommand({
    TableName: tables.users,
    FilterExpression: 'begins_with(username, :prefix)',
    ExpressionAttributeValues: { ':prefix': 'Demo' },
  }));
  cachedDemoBots = result.Items || [];
  demoBotsCachedAt = now;
  return cachedDemoBots;
}

function maskUsername(name: string): string {
  if (name.length <= 4) return name[0] + '***';
  return name.slice(0, 3) + '***' + name.slice(-2);
}

class DrawService {
  // ─── Templates ─────────────────────────────────────────────────────────
  async getTemplates(): Promise<DrawTemplate[]> {
    const result = await ddb.send(new ScanCommand({ TableName: tables.templates }));
    return (result.Items || []) as DrawTemplate[];
  }

  async getTemplate(templateId: string): Promise<DrawTemplate | undefined> {
    const result = await ddb.send(new GetCommand({
      TableName: tables.templates,
      Key: { templateId },
    }));
    return result.Item as DrawTemplate | undefined;
  }

  async createTemplate(params: {
    slots: number;
    entryDollars: number;
    requiresDeposit: boolean;
    enabled: boolean;
  }): Promise<DrawTemplate> {
    const template: DrawTemplate = {
      templateId: uuid(),
      slots: params.slots,
      entryDollars: params.entryDollars,
      entryCredits: params.entryDollars * CREDITS_PER_USDC,
      feePercent: DRAW_FEE_PERCENT,
      enabled: params.enabled,
      requiresDeposit: params.requiresDeposit,
      createdAt: new Date().toISOString(),
    };
    await ddb.send(new PutCommand({ TableName: tables.templates, Item: template }));
    return template;
  }

  async updateTemplate(templateId: string, updates: { enabled?: boolean; requiresDeposit?: boolean }): Promise<void> {
    const expParts: string[] = [];
    const values: Record<string, any> = {};
    if (updates.enabled !== undefined) {
      expParts.push('enabled = :en');
      values[':en'] = updates.enabled;
    }
    if (updates.requiresDeposit !== undefined) {
      expParts.push('requiresDeposit = :rd');
      values[':rd'] = updates.requiresDeposit;
    }
    if (expParts.length === 0) return;

    await ddb.send(new UpdateCommand({
      TableName: tables.templates,
      Key: { templateId },
      UpdateExpression: `SET ${expParts.join(', ')}`,
      ExpressionAttributeValues: values,
    }));
  }

  // ─── Draws CRUD ────────────────────────────────────────────────────────

  /** Read draw directly from DynamoDB without auto-finalize (avoids recursion) */
  private async getDrawRaw(drawId: string): Promise<Draw | undefined> {
    const result = await ddb.send(new GetCommand({
      TableName: tables.draws,
      Key: { drawId },
    }));
    return result.Item as Draw | undefined;
  }

  async getDraw(drawId: string): Promise<Draw | undefined> {
    const draw = await this.getDrawRaw(drawId);

    // Auto-finalize if countdown has expired (needed for Lambda where setTimeout doesn't persist)
    if (draw && draw.status === 'COUNTDOWN' && draw.countdownEndsAt) {
      const endsAt = new Date(draw.countdownEndsAt).getTime();
      if (Date.now() >= endsAt) {
        try {
          const finalized = await this.finalizeDraw(drawId);
          return finalized;
        } catch (err) {
          console.error('[DRAW] Auto-finalize failed:', err);
        }
      }
    }

    return draw;
  }

  async listDraws(mode: WalletMode, status?: DrawStatus): Promise<Draw[]> {
    if (status) {
      const result = await ddb.send(new QueryCommand({
        TableName: tables.draws,
        IndexName: 'modeStatus-index',
        KeyConditionExpression: '#mode = :mode AND #status = :status',
        ExpressionAttributeNames: { '#mode': 'mode', '#status': 'status' },
        ExpressionAttributeValues: { ':mode': mode, ':status': status },
      }));
      return (result.Items || []) as Draw[];
    }

    const result = await ddb.send(new QueryCommand({
      TableName: tables.draws,
      IndexName: 'modeStatus-index',
      KeyConditionExpression: '#mode = :mode',
      ExpressionAttributeNames: { '#mode': 'mode' },
      ExpressionAttributeValues: { ':mode': mode },
    }));
    return (result.Items || []) as Draw[];
  }

  async createDrawForTemplate(template: DrawTemplate, mode: WalletMode): Promise<Draw> {
    const now = new Date().toISOString();
    const draw: Draw = {
      drawId: uuid(),
      templateId: template.templateId,
      totalSlots: template.slots,
      entryCredits: template.entryCredits,
      entryDollars: template.entryDollars,
      feePercent: template.feePercent,
      mode,
      status: 'OPEN',
      participants: [],
      participantUsernames: {},
      filledSlots: 0,
      pool: 0,
      fee: 0,
      prize: 0,
      createdAt: now,
      updatedAt: now,
    };
    await ddb.send(new PutCommand({ TableName: tables.draws, Item: draw }));
    return draw;
  }

  // ─── Ensure open draws exist for all enabled templates ─────────────────
  async ensureOpenDraws(): Promise<void> {
    const templates = await this.getTemplates();
    for (const template of templates) {
      if (!template.enabled) continue;
      for (const mode of ['DEMO', 'REAL'] as WalletMode[]) {
        const openDraws = await ddb.send(new QueryCommand({
          TableName: tables.draws,
          IndexName: 'templateMode-index',
          KeyConditionExpression: 'templateId = :tid AND #mode = :mode',
          FilterExpression: '#status = :open',
          ExpressionAttributeNames: { '#status': 'status', '#mode': 'mode' },
          ExpressionAttributeValues: {
            ':tid': template.templateId,
            ':mode': mode,
            ':open': 'OPEN',
          },
        }));
        if (!openDraws.Items?.length) {
          await this.createDrawForTemplate(template, mode);
        }
      }
    }
  }

  // ─── Join draw ─────────────────────────────────────────────────────────
  async joinDraw(userId: string, drawId: string): Promise<Draw> {
    const draw = await this.getDraw(drawId);
    if (!draw) throw new AppError(404, 'Draw not found');
    if (draw.status !== 'OPEN') throw new AppError(400, 'Draw is not open for participation');
    if (draw.participants.includes(userId)) throw new AppError(409, 'You have already joined this draw');

    const user = await userService.getById(userId);
    if (!user) throw new AppError(404, 'User not found');

    // Check if $1 room requires prior deposit
    if (draw.mode === 'REAL' && draw.entryDollars === 1) {
      if (!user.firstRealDeposit) {
        throw new AppError(400, 'You must make a real deposit before joining $1 rooms');
      }
    }

    // Debit user balance (atomic check)
    const newBalance = await walletService.debitBalance(userId, draw.mode, draw.entryCredits);

    // Record entry transaction
    await walletService.recordTransaction({
      userId,
      walletMode: draw.mode,
      type: 'DRAW_ENTRY',
      amount: -draw.entryCredits,
      balanceAfter: newBalance,
      referenceId: draw.drawId,
      description: `Joined draw ${draw.drawId.slice(0, 8)} (${draw.entryDollars} USDC, ${draw.totalSlots} slots)`,
    });

    // Add participant to draw using ATOMIC increments (prevents race conditions with stale reads)
    try {
      const result = await ddb.send(new UpdateCommand({
        TableName: tables.draws,
        Key: { drawId },
        UpdateExpression: `
          SET participants = list_append(participants, :uid),
              participantUsernames.#username = :uname,
              filledSlots = filledSlots + :one,
              #pool = #pool + :entryCredits,
              updatedAt = :now
        `,
        ConditionExpression: '#status = :open AND filledSlots < totalSlots AND NOT contains(participants, :userId)',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#pool': 'pool',
          '#username': userId,
        },
        ExpressionAttributeValues: {
          ':uid': [userId],
          ':uname': user.username,
          ':one': 1,
          ':entryCredits': draw.entryCredits,
          ':open': 'OPEN',
          ':userId': userId,
          ':now': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      }));

      const updatedDraw = result.Attributes as Draw;

      // Auto-fill DEMO rooms with bots when a real user joins (not a bot)
      if (updatedDraw.mode === 'DEMO' && updatedDraw.filledSlots < updatedDraw.totalSlots && !user.username.startsWith('Demo')) {
        await this.autoFillDemoBots(drawId);
      }

      // If this join filled the room, start countdown (checked from returned atomic value)
      if (updatedDraw.filledSlots >= updatedDraw.totalSlots) {
        await this.startCountdown(updatedDraw);
      }

      return updatedDraw;
    } catch (err: any) {
      // Refund the user on any failure during draw update
      await walletService.creditBalance(userId, draw.mode, draw.entryCredits);
      await walletService.recordTransaction({
        userId,
        walletMode: draw.mode,
        type: 'DRAW_ENTRY',
        amount: draw.entryCredits,
        balanceAfter: newBalance + draw.entryCredits,
        referenceId: draw.drawId,
        description: `Refund: draw ${draw.drawId.slice(0, 8)} join failed`,
      });
      if (err.name === 'ConditionalCheckFailedException') {
        throw new AppError(409, 'Draw is no longer available or you already joined');
      }
      throw err;
    }
  }

  // ─── Auto-fill DEMO rooms with bots ────────────────────────────────────
  private async autoFillDemoBots(drawId: string): Promise<void> {
    const draw = await this.getDrawRaw(drawId);
    if (!draw || draw.status !== 'OPEN' || draw.mode !== 'DEMO') return;

    const slotsNeeded = draw.totalSlots - draw.filledSlots;
    if (slotsNeeded <= 0) return;

    // Get demo bots (cached at module level, 5min TTL)
    const bots = await getDemoBotsCached();
    if (bots.length === 0) return;

    // Pick random bots not already in this draw
    const availableBots = bots
      .filter((b: any) => !draw.participants.includes(b.userId))
      .sort(() => Math.random() - 0.5)
      .slice(0, slotsNeeded);

    for (const bot of availableBots) {
      // Top up demo balance if below 10K SC
      if ((bot.demoBalance || 0) < DEMO_INITIAL_CREDITS) {
        await walletService.creditBalance(bot.userId, 'DEMO', 100_000);
      }
      try {
        await this.joinDraw(bot.userId, drawId);
      } catch (err: any) {
        console.log(`[DRAW] Bot ${bot.username} auto-fill failed: ${err.message}`);
        break; // Room likely full or closed
      }
    }

    console.log(`[DRAW] Auto-filled ${availableBots.length} bot(s) into draw ${drawId.slice(0, 8)}`);
  }

  // ─── Countdown & finalization ──────────────────────────────────────────
  private async startCountdown(draw: Draw): Promise<void> {
    const serverSeed = generateSeed();
    const publicSeed = generateSeed();
    const commitHash = computeCommitHash(serverSeed, publicSeed);
    const countdownEndsAt = new Date(Date.now() + COUNTDOWN_SECONDS * 1000).toISOString();

    // Idempotent transition: only OPEN → COUNTDOWN (prevents double countdown start)
    try {
      await ddb.send(new UpdateCommand({
        TableName: tables.draws,
        Key: { drawId: draw.drawId },
        UpdateExpression: `
          SET #status = :countdown,
              serverSeed = :ss,
              publicSeed = :ps,
              commitHash = :ch,
              countdownEndsAt = :ce,
              updatedAt = :now
        `,
        ConditionExpression: '#status = :open',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':countdown': 'COUNTDOWN',
          ':open': 'OPEN',
          ':ss': serverSeed,
          ':ps': publicSeed,
          ':ch': commitHash,
          ':ce': countdownEndsAt,
          ':now': new Date().toISOString(),
        },
      }));
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') {
        console.log(`[DRAW] ${draw.drawId} already past OPEN, skipping countdown start`);
        return;
      }
      throw err;
    }

    // Schedule finalization (local: setTimeout; production: EventBridge)
    const timer = setTimeout(() => {
      this.finalizeDraw(draw.drawId).catch(console.error);
    }, COUNTDOWN_SECONDS * 1000);
    countdownTimers.set(draw.drawId, timer);

    console.log(`[DRAW] ${draw.drawId} countdown started, ends at ${countdownEndsAt}`);

    // Immediately create a new OPEN draw for this template so others can join
    const template = await this.getTemplate(draw.templateId);
    if (template?.enabled) {
      await this.createDrawForTemplate(template, draw.mode);
      console.log(`[DRAW] New OPEN draw created for template ${draw.templateId} (${draw.mode})`);
    }
  }

  async finalizeDraw(drawId: string): Promise<Draw> {
    countdownTimers.delete(drawId);

    const draw = await this.getDrawRaw(drawId);
    if (!draw) throw new AppError(404, 'Draw not found');
    if (draw.status !== 'COUNTDOWN' && draw.status !== 'FULL') {
      throw new AppError(400, 'Draw is not in countdown state');
    }

    // Mark as RUNNING (conditional: only if still COUNTDOWN or FULL — prevents double finalization)
    try {
      await ddb.send(new UpdateCommand({
        TableName: tables.draws,
        Key: { drawId },
        UpdateExpression: 'SET #status = :running, updatedAt = :now',
        ConditionExpression: '#status IN (:countdown, :full)',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':running': 'RUNNING',
          ':countdown': 'COUNTDOWN',
          ':full': 'FULL',
          ':now': new Date().toISOString(),
        },
      }));
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') {
        console.log(`[DRAW] ${drawId} already running/completed, skipping duplicate finalization`);
        const current = await this.getDrawRaw(drawId);
        if (current) return current;
        throw new AppError(404, 'Draw not found');
      }
      throw err;
    }

    // Select winner (serverSeed + publicSeed + drawId for verifiable fairness)
    const winnerIndex = selectWinnerIndex(draw.serverSeed!, draw.publicSeed!, draw.drawId, draw.participants.length);
    const winnerId = draw.participants[winnerIndex];
    const winnerUsername = draw.participantUsernames[winnerId];

    const fee = Math.round(draw.pool * draw.feePercent / 100);
    const prize = draw.pool - fee;
    const completedAt = new Date().toISOString();

    // Build contract snapshot
    const contract: DrawContract = {
      drawId: draw.drawId,
      templateId: draw.templateId,
      totalSlots: draw.totalSlots,
      entryCredits: draw.entryCredits,
      feePercent: draw.feePercent,
      mode: draw.mode,
      participants: draw.participants,
      participantUsernames: draw.participantUsernames,
      pool: draw.pool,
      fee,
      prize,
      commitHash: draw.commitHash!,
      publicSeed: draw.publicSeed!,
      revealedServerSeed: draw.serverSeed!,
      winnerId,
      winnerUsername,
      createdAt: draw.createdAt,
      completedAt,
    };

    // Credit winner BEFORE marking as COMPLETED to prevent lost credits
    let winnerBalance: number;
    try {
      winnerBalance = await walletService.creditBalance(winnerId, draw.mode, prize);
      await walletService.recordTransaction({
        userId: winnerId,
        walletMode: draw.mode,
        type: 'DRAW_WIN',
        amount: prize,
        balanceAfter: winnerBalance,
        referenceId: draw.drawId,
        description: `Won draw ${draw.drawId.slice(0, 8)} (${creditsToUSDC(prize)} USDC)`,
      });

      // Record fee transaction (system)
      await walletService.recordTransaction({
        userId: 'SYSTEM',
        walletMode: draw.mode,
        type: 'DRAW_FEE',
        amount: fee,
        balanceAfter: 0,
        referenceId: draw.drawId,
        description: `Fee from draw ${draw.drawId.slice(0, 8)}`,
      });
    } catch (err) {
      // Credit failed — refund all participants so nobody loses credits
      console.error(`[DRAW] ${drawId} credit failed, refunding participants:`, err);
      for (const pid of draw.participants) {
        try {
          const bal = await walletService.creditBalance(pid, draw.mode, draw.entryCredits);
          await walletService.recordTransaction({
            userId: pid,
            walletMode: draw.mode,
            type: 'DRAW_REFUND',
            amount: draw.entryCredits,
            balanceAfter: bal,
            referenceId: draw.drawId,
            description: `Refund draw ${draw.drawId.slice(0, 8)} (credit error)`,
          });
        } catch (refundErr) {
          console.error(`[DRAW] Refund failed for ${pid}:`, refundErr);
        }
      }
      // Reset draw to allow retry
      await ddb.send(new UpdateCommand({
        TableName: tables.draws,
        Key: { drawId },
        UpdateExpression: 'SET #status = :countdown, updatedAt = :now',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':countdown': 'COUNTDOWN', ':now': new Date().toISOString() },
      }));
      throw new AppError(500, 'Failed to credit winner, participants refunded');
    }

    // Update draw to COMPLETED (conditional: only if still RUNNING — prevents double completion)
    await ddb.send(new UpdateCommand({
      TableName: tables.draws,
      Key: { drawId },
      UpdateExpression: `
        SET #status = :completed,
            winnerId = :wid,
            winnerUsername = :wname,
            fee = :fee,
            prize = :prize,
            revealedServerSeed = :rss,
            contractSnapshot = :contract,
            completedAt = :cat,
            updatedAt = :now
      `,
      ConditionExpression: '#status = :running',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':completed': 'COMPLETED',
        ':running': 'RUNNING',
        ':wid': winnerId,
        ':wname': winnerUsername,
        ':fee': fee,
        ':prize': prize,
        ':rss': draw.serverSeed!,
        ':contract': contract,
        ':cat': completedAt,
        ':now': new Date().toISOString(),
      },
    }));

    // Send email notifications
    emailService.sendDrawCompletionEmails(contract).catch(console.error);

    // Ensure an open draw exists for this template (may already exist from startCountdown)
    const template = await this.getTemplate(draw.templateId);
    if (template?.enabled) {
      const openDraws = await ddb.send(new QueryCommand({
        TableName: tables.draws,
        IndexName: 'templateMode-index',
        KeyConditionExpression: 'templateId = :tid AND #mode = :mode',
        FilterExpression: '#status = :open',
        ExpressionAttributeNames: { '#status': 'status', '#mode': 'mode' },
        ExpressionAttributeValues: { ':tid': draw.templateId, ':mode': draw.mode, ':open': 'OPEN' },
      }));
      if (!openDraws.Items?.length) {
        await this.createDrawForTemplate(template, draw.mode);
      }
    }

    console.log(`[DRAW] ${drawId} completed. Winner: ${winnerUsername} (${creditsToUSDC(prize)} USDC)`);

    return (await this.getDrawRaw(drawId))!;
  }

  // ─── Rankings (cached: recomputed daily by sweeper) ─────────────────────
  async getRankings(mode: WalletMode): Promise<any[]> {
    // Read from cache first
    try {
      const cacheResult = await ddb.send(new GetCommand({
        TableName: tables.cache,
        Key: { pk: 'RANKINGS', sk: mode },
      }));
      if (cacheResult.Item?.data) {
        return cacheResult.Item.data;
      }
    } catch (err) {
      console.error('[RANKINGS] Cache read failed, computing fresh:', err);
    }

    // Cache miss (first run): compute and cache
    return this.recomputeRankings(mode);
  }

  async recomputeRankings(mode: WalletMode): Promise<any[]> {
    const result = await ddb.send(new QueryCommand({
      TableName: tables.draws,
      IndexName: 'modeStatus-index',
      KeyConditionExpression: '#mode = :mode AND #status = :status',
      ExpressionAttributeNames: { '#mode': 'mode', '#status': 'status' },
      ExpressionAttributeValues: { ':mode': mode, ':status': 'COMPLETED' },
    }));
    const draws = (result.Items || []) as Draw[];

    // Get admin user IDs to exclude from rankings
    const usersResult = await ddb.send(new ScanCommand({
      TableName: tables.users,
      FilterExpression: '#role = :admin',
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: { ':admin': 'ADMIN' },
      ProjectionExpression: 'userId',
    }));
    const adminIds = new Set((usersResult.Items || []).map((u) => u.userId));

    const stats = new Map<string, { userId: string; username: string; wins: number; participations: number; totalWinnings: number }>();

    for (const draw of draws) {
      for (const uid of draw.participants) {
        if (adminIds.has(uid)) continue;
        if (!stats.has(uid)) {
          stats.set(uid, {
            userId: uid,
            username: draw.participantUsernames[uid] || uid.slice(0, 8),
            wins: 0,
            participations: 0,
            totalWinnings: 0,
          });
        }
        const s = stats.get(uid)!;
        s.participations++;
        if (draw.winnerId === uid) {
          s.wins++;
          s.totalWinnings += draw.prize || 0;
        }
      }
    }

    const rankings = Array.from(stats.values())
      .map((s) => ({
        ...s,
        username: maskUsername(s.username),
        winRate: s.participations > 0 ? Math.round((s.wins / s.participations) * 100) : 0,
      }))
      .filter((s) => !s.username.startsWith('Dem'))
      .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || b.totalWinnings - a.totalWinnings)
      .slice(0, 50);

    // Write to cache
    try {
      await ddb.send(new PutCommand({
        TableName: tables.cache,
        Item: { pk: 'RANKINGS', sk: mode, data: rankings, computedAt: Date.now() },
      }));
    } catch (err) {
      console.error('[RANKINGS] Cache write failed:', err);
    }

    return rankings;
  }

  // ─── Admin: force finalize (dev tool) ──────────────────────────────────
  async forceFinalize(drawId: string): Promise<Draw> {
    const draw = await this.getDrawRaw(drawId);
    if (!draw) throw new AppError(404, 'Draw not found');
    if (draw.status === 'COMPLETED') throw new AppError(400, 'Draw already completed');

    // If not in countdown, set up seeds
    if (!draw.serverSeed) {
      const serverSeed = generateSeed();
      const publicSeed = generateSeed();
      await ddb.send(new UpdateCommand({
        TableName: tables.draws,
        Key: { drawId },
        UpdateExpression: 'SET serverSeed = :ss, publicSeed = :ps, commitHash = :ch, #status = :countdown',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':ss': serverSeed,
          ':ps': publicSeed,
          ':ch': computeCommitHash(serverSeed, publicSeed),
          ':countdown': 'COUNTDOWN',
        },
      }));
    }

    return this.finalizeDraw(drawId);
  }
}

export const drawService = new DrawService();
