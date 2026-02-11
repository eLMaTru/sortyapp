import { ScanCommand, QueryCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { AdminMetrics, WalletMode } from '@sortyapp/shared';
import { ddb, tables } from '../lib/dynamo';

class MetricsService {
  /** Read metrics from cache (recomputed every 30min by sweeper) */
  async getAdminMetrics(mode?: WalletMode): Promise<AdminMetrics> {
    const sk = mode ? `LATEST#${mode}` : 'LATEST';
    try {
      const cacheResult = await ddb.send(new GetCommand({
        TableName: tables.cache,
        Key: { pk: 'METRICS', sk },
      }));
      if (cacheResult.Item?.data) {
        return cacheResult.Item.data as AdminMetrics;
      }
    } catch (err) {
      console.error('[METRICS] Cache read failed, computing fresh:', err);
    }

    // Cache miss (first run): compute and cache
    return this.recomputeMetrics(mode);
  }

  /** Full recomputation: scans all tables, writes result to cache */
  async recomputeMetrics(mode?: WalletMode): Promise<AdminMetrics> {
    const [usersResult, drawsResult, withdrawalsResult] = await Promise.all([
      ddb.send(new ScanCommand({ TableName: tables.users, Select: 'COUNT' })),
      ddb.send(new ScanCommand({ TableName: tables.draws })),
      ddb.send(new ScanCommand({ TableName: tables.withdrawals })),
    ]);

    let draws = (drawsResult.Items || []) as any[];
    const withdrawals = (withdrawalsResult.Items || []) as any[];

    // Filter draws by mode if specified
    if (mode) {
      draws = draws.filter((d) => d.mode === mode);
    }

    const now = Date.now();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    const completedDraws = draws.filter((d) => d.status === 'COMPLETED');
    const openDraws = draws.filter((d) => d.status === 'OPEN');
    const recentDraws = completedDraws.filter((d) => d.completedAt && d.completedAt > oneDayAgo);

    const totalSCSpent = completedDraws.reduce((sum, d) => sum + (d.pool || 0), 0);
    const totalFeeSC = completedDraws.reduce((sum, d) => sum + (d.fee || 0), 0);

    const pendingWithdrawals = withdrawals.filter((w) => w.status === 'PENDING');
    const sentWithdrawals = withdrawals.filter((w) => w.status === 'SENT');

    const usersFullResult = await ddb.send(new ScanCommand({
      TableName: tables.users,
      FilterExpression: 'createdAt > :since',
      ExpressionAttributeValues: { ':since': oneDayAgo },
      Select: 'COUNT',
    }));

    const metrics: AdminMetrics = {
      mode,
      totalUsers: usersResult.Count || 0,
      totalDrawsCompleted: completedDraws.length,
      totalDrawsOpen: openDraws.length,
      totalSCSpent,
      totalFeeSC,
      totalWithdrawalsPending: pendingWithdrawals.length,
      totalWithdrawalsSent: sentWithdrawals.length,
      recentDraws: recentDraws.length,
      recentUsers: usersFullResult.Count || 0,
    };

    // Write to cache
    const sk = mode ? `LATEST#${mode}` : 'LATEST';
    try {
      await ddb.send(new PutCommand({
        TableName: tables.cache,
        Item: { pk: 'METRICS', sk, data: metrics, computedAt: Date.now() },
      }));
    } catch (err) {
      console.error('[METRICS] Cache write failed:', err);
    }

    return metrics;
  }
}

export const metricsService = new MetricsService();
