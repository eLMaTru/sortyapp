import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { AdminMetrics, WalletMode } from '@sortyapp/shared';
import { ddb, tables } from '../lib/dynamo';

class MetricsService {
  async getAdminMetrics(): Promise<AdminMetrics> {
    // Parallel queries for efficiency
    const [usersResult, drawsResult, withdrawalsResult] = await Promise.all([
      ddb.send(new ScanCommand({ TableName: tables.users, Select: 'COUNT' })),
      ddb.send(new ScanCommand({ TableName: tables.draws })),
      ddb.send(new ScanCommand({ TableName: tables.withdrawals })),
    ]);

    const draws = (drawsResult.Items || []) as any[];
    const withdrawals = (withdrawalsResult.Items || []) as any[];

    const now = Date.now();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    const completedDraws = draws.filter((d) => d.status === 'COMPLETED');
    const openDraws = draws.filter((d) => d.status === 'OPEN');
    const recentDraws = completedDraws.filter((d) => d.completedAt && d.completedAt > oneDayAgo);

    const totalSCSpent = completedDraws.reduce((sum, d) => sum + (d.pool || 0), 0);
    const totalFeeSC = completedDraws.reduce((sum, d) => sum + (d.fee || 0), 0);

    const pendingWithdrawals = withdrawals.filter((w) => w.status === 'PENDING');
    const sentWithdrawals = withdrawals.filter((w) => w.status === 'SENT');

    // Recent users (registered in last 24h) — need to scan users table for this
    const usersFullResult = await ddb.send(new ScanCommand({
      TableName: tables.users,
      FilterExpression: 'createdAt > :since',
      ExpressionAttributeValues: { ':since': oneDayAgo },
      Select: 'COUNT',
    }));

    return {
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
  }
}

export const metricsService = new MetricsService();
