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
  async getDraw(drawId: string): Promise<Draw | undefined> {
    const result = await ddb.send(new GetCommand({
      TableName: tables.draws,
      Key: { drawId },
    }));
    return result.Item as Draw | undefined;
  }

  async listDraws(mode: WalletMode, status?: DrawStatus): Promise<Draw[]> {
    if (status) {
      const result = await ddb.send(new QueryCommand({
        TableName: tables.draws,
        IndexName: 'modeStatus-index',
        KeyConditionExpression: 'mode = :mode AND #status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':mode': mode, ':status': status },
      }));
      return (result.Items || []) as Draw[];
    }

    const result = await ddb.send(new QueryCommand({
      TableName: tables.draws,
      IndexName: 'modeStatus-index',
      KeyConditionExpression: 'mode = :mode',
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
          KeyConditionExpression: 'templateId = :tid AND mode = :mode',
          FilterExpression: '#status = :open',
          ExpressionAttributeNames: { '#status': 'status' },
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

    // Add participant to draw (conditional: still OPEN and not full)
    const newFilledSlots = draw.filledSlots + 1;
    const newPool = draw.pool + draw.entryCredits;
    const isFull = newFilledSlots >= draw.totalSlots;

    try {
      const result = await ddb.send(new UpdateCommand({
        TableName: tables.draws,
        Key: { drawId },
        UpdateExpression: `
          SET participants = list_append(participants, :uid),
              participantUsernames.#username = :uname,
              filledSlots = :filled,
              pool = :pool,
              #status = :newStatus,
              updatedAt = :now
        `,
        ConditionExpression: '#status = :open AND filledSlots < :totalSlots AND NOT contains(participants, :userId)',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#username': userId,
        },
        ExpressionAttributeValues: {
          ':uid': [userId],
          ':uname': user.username,
          ':filled': newFilledSlots,
          ':pool': newPool,
          ':newStatus': isFull ? 'FULL' : 'OPEN',
          ':open': 'OPEN',
          ':totalSlots': draw.totalSlots,
          ':userId': userId,
          ':now': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      }));

      const updatedDraw = result.Attributes as Draw;

      if (isFull) {
        await this.startCountdown(updatedDraw);
      }

      return updatedDraw;
    } catch (err: any) {
      // If conditional check failed, refund the user
      if (err.name === 'ConditionalCheckFailedException') {
        await walletService.creditBalance(userId, draw.mode, draw.entryCredits);
        await walletService.recordTransaction({
          userId,
          walletMode: draw.mode,
          type: 'DRAW_ENTRY',
          amount: draw.entryCredits,
          balanceAfter: newBalance + draw.entryCredits,
          referenceId: draw.drawId,
          description: `Refund: draw ${draw.drawId.slice(0, 8)} was no longer available`,
        });
        throw new AppError(409, 'Draw is no longer available or you already joined');
      }
      throw err;
    }
  }

  // ─── Countdown & finalization ──────────────────────────────────────────
  private async startCountdown(draw: Draw): Promise<void> {
    const serverSeed = generateSeed();
    const publicSeed = generateSeed();
    const commitHash = computeCommitHash(serverSeed, publicSeed);
    const countdownEndsAt = new Date(Date.now() + COUNTDOWN_SECONDS * 1000).toISOString();

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
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':countdown': 'COUNTDOWN',
        ':ss': serverSeed,
        ':ps': publicSeed,
        ':ch': commitHash,
        ':ce': countdownEndsAt,
        ':now': new Date().toISOString(),
      },
    }));

    // Schedule finalization (local: setTimeout; production: EventBridge)
    const timer = setTimeout(() => {
      this.finalizeDraw(draw.drawId).catch(console.error);
    }, COUNTDOWN_SECONDS * 1000);
    countdownTimers.set(draw.drawId, timer);

    console.log(`[DRAW] ${draw.drawId} countdown started, ends at ${countdownEndsAt}`);
  }

  async finalizeDraw(drawId: string): Promise<Draw> {
    countdownTimers.delete(drawId);

    const draw = await this.getDraw(drawId);
    if (!draw) throw new AppError(404, 'Draw not found');
    if (draw.status !== 'COUNTDOWN' && draw.status !== 'FULL') {
      throw new AppError(400, 'Draw is not in countdown state');
    }

    // Mark as RUNNING
    await ddb.send(new UpdateCommand({
      TableName: tables.draws,
      Key: { drawId },
      UpdateExpression: 'SET #status = :running, updatedAt = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':running': 'RUNNING', ':now': new Date().toISOString() },
    }));

    // Select winner
    const winnerIndex = selectWinnerIndex(draw.serverSeed!, draw.drawId, draw.participants.length);
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

    // Update draw to COMPLETED
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
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':completed': 'COMPLETED',
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

    // Credit winner
    const winnerBalance = await walletService.creditBalance(winnerId, draw.mode, prize);
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

    // Send email notifications
    emailService.sendDrawCompletionEmails(contract).catch(console.error);

    // Auto-create next open draw for this template
    const template = await this.getTemplate(draw.templateId);
    if (template?.enabled) {
      await this.createDrawForTemplate(template, draw.mode);
    }

    console.log(`[DRAW] ${drawId} completed. Winner: ${winnerUsername} (${creditsToUSDC(prize)} USDC)`);

    return (await this.getDraw(drawId))!;
  }

  // ─── Admin: force finalize (dev tool) ──────────────────────────────────
  async forceFinalize(drawId: string): Promise<Draw> {
    const draw = await this.getDraw(drawId);
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
