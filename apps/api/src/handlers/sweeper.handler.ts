import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, tables } from '../lib/dynamo';
import { drawService } from '../services/draw.service';
import { walletService } from '../services/wallet.service';

const DEMO_BOT_MIN_BALANCE = 10_000; // 100 USDC in credits
const DEMO_BOT_TOPUP_AMOUNT = 100_000; // 1000 USDC in credits

/**
 * EventBridge sweeper: runs every 1 minute.
 * 1. Finalizes stuck COUNTDOWN draws (safety net for polling-based finalization)
 * 2. Auto-fills OPEN DEMO rooms with bots, leaving 1 slot for real users
 * 3. Auto-tops-up demo bot balances when low
 */
export const handler = async (): Promise<void> => {
  await finalizeStuckDraws();
  await fillDemoRooms();
};

// ─── Task 1: Finalize stuck COUNTDOWN draws ──────────────────────────────────
async function finalizeStuckDraws(): Promise<void> {
  const now = new Date().toISOString();

  const result = await ddb.send(new ScanCommand({
    TableName: tables.draws,
    FilterExpression: '#status = :countdown AND countdownEndsAt <= :now',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':countdown': 'COUNTDOWN', ':now': now },
  }));

  const stuckDraws = result.Items || [];
  if (stuckDraws.length === 0) return;

  console.log(`[SWEEPER] Found ${stuckDraws.length} stuck COUNTDOWN draw(s)`);

  for (const draw of stuckDraws) {
    try {
      await drawService.finalizeDraw(draw.drawId);
      console.log(`[SWEEPER] Finalized draw ${draw.drawId}`);
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') {
        console.log(`[SWEEPER] Draw ${draw.drawId} already handled`);
      } else {
        console.error(`[SWEEPER] Failed to finalize ${draw.drawId}:`, err);
      }
    }
  }
}

// ─── Task 2: Auto-fill OPEN DEMO rooms with bots ────────────────────────────
async function fillDemoRooms(): Promise<void> {
  // Get all demo bot users (username starts with "Demo")
  const usersResult = await ddb.send(new ScanCommand({
    TableName: tables.users,
    FilterExpression: 'begins_with(username, :prefix)',
    ExpressionAttributeValues: { ':prefix': 'Demo' },
  }));
  const bots = usersResult.Items || [];
  if (bots.length === 0) return;

  // Top up any bots with low demo balance
  for (const bot of bots) {
    if ((bot.demoBalance || 0) < DEMO_BOT_MIN_BALANCE) {
      try {
        await walletService.creditBalance(bot.userId, 'DEMO', DEMO_BOT_TOPUP_AMOUNT);
        await walletService.recordTransaction({
          userId: bot.userId,
          walletMode: 'DEMO',
          type: 'DEPOSIT',
          amount: DEMO_BOT_TOPUP_AMOUNT,
          balanceAfter: (bot.demoBalance || 0) + DEMO_BOT_TOPUP_AMOUNT,
          referenceId: 'sweeper-topup',
          description: 'Auto top-up demo bot balance',
        });
        console.log(`[SWEEPER] Topped up bot ${bot.username} with ${DEMO_BOT_TOPUP_AMOUNT} SC`);
      } catch (err) {
        console.error(`[SWEEPER] Failed to top up bot ${bot.username}:`, err);
      }
    }
  }

  // Get all OPEN DEMO draws
  const drawsResult = await ddb.send(new ScanCommand({
    TableName: tables.draws,
    FilterExpression: '#status = :open AND #mode = :demo',
    ExpressionAttributeNames: { '#status': 'status', '#mode': 'mode' },
    ExpressionAttributeValues: { ':open': 'OPEN', ':demo': 'DEMO' },
  }));

  const openDraws = drawsResult.Items || [];
  if (openDraws.length === 0) return;

  for (const draw of openDraws) {
    const slotsNeeded = draw.totalSlots - 1 - draw.filledSlots; // Leave 1 slot for user
    if (slotsNeeded <= 0) continue;

    // Pick bots not already in this draw
    const availableBots = bots.filter(
      (b: any) => !draw.participants?.includes(b.userId)
    );

    // Shuffle and pick slotsNeeded bots
    const shuffled = availableBots.sort(() => Math.random() - 0.5);
    const botsToJoin = shuffled.slice(0, slotsNeeded);

    for (const bot of botsToJoin) {
      try {
        await drawService.joinDraw(bot.userId, draw.drawId);
        console.log(`[SWEEPER] Bot ${bot.username} joined draw ${draw.drawId.slice(0, 8)} (${draw.entryCredits} SC)`);
      } catch (err: any) {
        // Draw may have filled or bot already joined — skip
        console.log(`[SWEEPER] Bot ${bot.username} failed to join ${draw.drawId.slice(0, 8)}: ${err.message}`);
        break; // If one fails (draw full/closed), stop trying for this draw
      }
    }
  }
}
