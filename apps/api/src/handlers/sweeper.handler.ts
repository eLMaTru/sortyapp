import { QueryCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, tables } from '../lib/dynamo';
import { drawService } from '../services/draw.service';
import { metricsService } from '../services/metrics.service';
import { depositService } from '../services/deposit.service';

/**
 * EventBridge sweeper: runs every 5 minutes.
 * 1. Finalizes stuck COUNTDOWN draws (safety net — getDraw auto-finalizes on poll)
 * 2. Recomputes cached rankings (daily) and metrics (every 30 min)
 *
 * Demo rooms are NOT filled here — bots join instantly via autoFillDemoBots
 * when a real user clicks "Participate".
 */
export const handler = async (): Promise<void> => {
  await finalizeStuckDraws();
  await expireDepositRequests();
  await recomputeCachedData();
};

// ─── Finalize stuck COUNTDOWN draws (GSI query, no scan) ─────────────────
async function finalizeStuckDraws(): Promise<void> {
  const now = new Date().toISOString();

  // Query COUNTDOWN draws for both modes via GSI (parallel)
  const [demoResult, realResult] = await Promise.all([
    ddb.send(new QueryCommand({
      TableName: tables.draws,
      IndexName: 'modeStatus-index',
      KeyConditionExpression: '#mode = :mode AND #status = :status',
      FilterExpression: 'countdownEndsAt <= :now',
      ExpressionAttributeNames: { '#mode': 'mode', '#status': 'status' },
      ExpressionAttributeValues: { ':mode': 'DEMO', ':status': 'COUNTDOWN', ':now': now },
    })),
    ddb.send(new QueryCommand({
      TableName: tables.draws,
      IndexName: 'modeStatus-index',
      KeyConditionExpression: '#mode = :mode AND #status = :status',
      FilterExpression: 'countdownEndsAt <= :now',
      ExpressionAttributeNames: { '#mode': 'mode', '#status': 'status' },
      ExpressionAttributeValues: { ':mode': 'REAL', ':status': 'COUNTDOWN', ':now': now },
    })),
  ]);

  const stuckDraws = [...(demoResult.Items || []), ...(realResult.Items || [])];
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

// ─── Expire stale deposit requests (>48h) ────────────────────────────────
async function expireDepositRequests(): Promise<void> {
  try {
    const expired = await depositService.expirePending();
    if (expired > 0) {
      console.log(`[SWEEPER] Expired ${expired} deposit request(s)`);
    }
  } catch (err) {
    console.error('[SWEEPER] Deposit expiry failed:', err);
  }
}

// ─── Recompute cached data periodically ──────────────────────────────────
async function recomputeCachedData(): Promise<void> {
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const THIRTY_MIN_MS = 30 * 60 * 1000;

  // Check rankings staleness
  try {
    const rankingsCache = await ddb.send(new GetCommand({
      TableName: tables.cache,
      Key: { pk: 'RANKINGS', sk: 'LAST_COMPUTED' },
    }));
    const lastRankings = rankingsCache.Item?.computedAt || 0;

    if (now - lastRankings > ONE_DAY_MS) {
      console.log('[SWEEPER] Recomputing rankings...');
      await Promise.all([
        drawService.recomputeRankings('DEMO'),
        drawService.recomputeRankings('REAL'),
      ]);
      await ddb.send(new PutCommand({
        TableName: tables.cache,
        Item: { pk: 'RANKINGS', sk: 'LAST_COMPUTED', computedAt: now },
      }));
      console.log('[SWEEPER] Rankings recomputed');
    }
  } catch (err) {
    console.error('[SWEEPER] Rankings recomputation failed:', err);
  }

  // Check metrics staleness
  try {
    const metricsCache = await ddb.send(new GetCommand({
      TableName: tables.cache,
      Key: { pk: 'METRICS', sk: 'LAST_COMPUTED' },
    }));
    const lastMetrics = metricsCache.Item?.computedAt || 0;

    if (now - lastMetrics > THIRTY_MIN_MS) {
      console.log('[SWEEPER] Recomputing metrics...');
      await metricsService.recomputeMetrics();
      await ddb.send(new PutCommand({
        TableName: tables.cache,
        Item: { pk: 'METRICS', sk: 'LAST_COMPUTED', computedAt: now },
      }));
      console.log('[SWEEPER] Metrics recomputed');
    }
  } catch (err) {
    console.error('[SWEEPER] Metrics recomputation failed:', err);
  }
}
