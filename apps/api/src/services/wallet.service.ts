import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import {
  Transaction,
  TransactionType,
  Withdrawal,
  WalletMode,
  DailyDeposit,
  creditsToUSDC,
  todayDateString,
} from '@sortyapp/shared';
import { ddb, tables } from '../lib/dynamo';
import { config } from '../lib/config';
import { AppError } from '../middleware/error.middleware';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

class WalletService {
  // ─── Balance operations ──────────────────────────────────────────────────
  async creditBalance(userId: string, mode: WalletMode, amount: number): Promise<number> {
    const field = mode === 'DEMO' ? 'demoBalance' : 'realBalance';
    const result = await ddb.send(new UpdateCommand({
      TableName: tables.users,
      Key: { userId },
      UpdateExpression: `SET ${field} = ${field} + :amt, updatedAt = :now`,
      ExpressionAttributeValues: { ':amt': amount, ':now': new Date().toISOString() },
      ReturnValues: 'ALL_NEW',
    }));
    return (result.Attributes as any)[field];
  }

  async debitBalance(userId: string, mode: WalletMode, amount: number): Promise<number> {
    const field = mode === 'DEMO' ? 'demoBalance' : 'realBalance';
    try {
      const result = await ddb.send(new UpdateCommand({
        TableName: tables.users,
        Key: { userId },
        UpdateExpression: `SET ${field} = ${field} - :amt, updatedAt = :now`,
        ConditionExpression: `${field} >= :amt`,
        ExpressionAttributeValues: { ':amt': amount, ':now': new Date().toISOString() },
        ReturnValues: 'ALL_NEW',
      }));
      return (result.Attributes as any)[field];
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') {
        throw new AppError(400, 'Insufficient balance');
      }
      throw err;
    }
  }

  // ─── Transactions ────────────────────────────────────────────────────────
  async recordTransaction(params: {
    userId: string;
    walletMode: WalletMode;
    type: TransactionType;
    amount: number;
    balanceAfter: number;
    referenceId?: string;
    description: string;
  }): Promise<Transaction> {
    const tx: Transaction = {
      transactionId: uuid(),
      userId: params.userId,
      walletMode: params.walletMode,
      type: params.type,
      amount: params.amount,
      balanceAfter: params.balanceAfter,
      referenceId: params.referenceId,
      description: params.description,
      createdAt: new Date().toISOString(),
    };
    await ddb.send(new PutCommand({ TableName: tables.transactions, Item: tx }));
    return tx;
  }

  async getTransactions(userId: string, limit = 50): Promise<Transaction[]> {
    const result = await ddb.send(new QueryCommand({
      TableName: tables.transactions,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      ScanIndexForward: false,
      Limit: limit,
    }));
    return (result.Items || []) as Transaction[];
  }

  // ─── Simulate Deposit (admin/dev) ────────────────────────────────────────
  async simulateDeposit(userId: string, amountCredits: number): Promise<{ newBalance: number; tx: Transaction }> {
    if (amountCredits < config.minDepositCredits) {
      throw new AppError(400, `Minimum deposit is ${config.minDepositCredits} credits`);
    }

    // Check daily limit
    await this.checkDailyDepositLimit(userId, amountCredits);

    const newBalance = await this.creditBalance(userId, 'REAL', amountCredits);

    const tx = await this.recordTransaction({
      userId,
      walletMode: 'REAL',
      type: 'DEPOSIT',
      amount: amountCredits,
      balanceAfter: newBalance,
      description: `Simulated deposit of ${creditsToUSDC(amountCredits)} USDC`,
    });

    // Track daily deposit
    await this.trackDailyDeposit(userId, amountCredits);

    // Handle first deposit referral bonus
    await this.handleFirstDeposit(userId);

    return { newBalance, tx };
  }

  // ─── Withdrawals ─────────────────────────────────────────────────────────
  async requestWithdrawal(userId: string, amountCredits: number, walletAddress: string): Promise<Withdrawal> {
    if (amountCredits < config.minWithdrawalCredits) {
      throw new AppError(400, `Minimum withdrawal is ${config.minWithdrawalCredits} credits`);
    }

    // Debit balance first (atomic)
    const newBalance = await this.debitBalance(userId, 'REAL', amountCredits);

    const amountUSDC = creditsToUSDC(amountCredits);
    const feeUSDC = Number((amountUSDC * config.withdrawalFeePercent / 100).toFixed(2));
    const netUSDC = Number((amountUSDC - feeUSDC).toFixed(2));
    const now = new Date().toISOString();

    const withdrawal: Withdrawal = {
      withdrawalId: uuid(),
      userId,
      amountCredits,
      amountUSDC,
      feeUSDC,
      netUSDC,
      status: 'PENDING',
      walletAddress,
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: tables.withdrawals, Item: withdrawal }));

    // Record debit transaction
    await this.recordTransaction({
      userId,
      walletMode: 'REAL',
      type: 'WITHDRAWAL',
      amount: -amountCredits,
      balanceAfter: newBalance,
      referenceId: withdrawal.withdrawalId,
      description: `Withdrawal of ${netUSDC} USDC (fee: ${feeUSDC} USDC)`,
    });

    return withdrawal;
  }

  async approveWithdrawal(withdrawalId: string, txHash: string): Promise<Withdrawal> {
    const result = await ddb.send(new UpdateCommand({
      TableName: tables.withdrawals,
      Key: { withdrawalId },
      UpdateExpression: 'SET #status = :sent, txHash = :hash, updatedAt = :now',
      ConditionExpression: '#status = :pending',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':sent': 'SENT',
        ':pending': 'PENDING',
        ':hash': txHash,
        ':now': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    }));

    if (!result.Attributes) throw new AppError(404, 'Withdrawal not found or not in PENDING status');
    return result.Attributes as Withdrawal;
  }

  async getWithdrawals(userId: string): Promise<Withdrawal[]> {
    const result = await ddb.send(new QueryCommand({
      TableName: tables.withdrawals,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      ScanIndexForward: false,
    }));
    return (result.Items || []) as Withdrawal[];
  }

  async listPendingWithdrawals(): Promise<Withdrawal[]> {
    const result = await ddb.send(new QueryCommand({
      TableName: tables.withdrawals,
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :pending',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':pending': 'PENDING' },
    }));
    return (result.Items || []) as Withdrawal[];
  }

  // ─── Daily deposit limit tracking ────────────────────────────────────────
  private async checkDailyDepositLimit(userId: string, amountCredits: number): Promise<void> {
    const date = todayDateString();
    const result = await ddb.send(new GetCommand({
      TableName: tables.dailyDeposits,
      Key: { userId, date },
    }));
    const current = (result.Item as DailyDeposit)?.totalCredits || 0;
    if (current + amountCredits > config.maxDailyDepositCredits) {
      throw new AppError(400, `Daily deposit limit of ${creditsToUSDC(config.maxDailyDepositCredits)} USDC exceeded`);
    }
  }

  private async trackDailyDeposit(userId: string, amountCredits: number): Promise<void> {
    const date = todayDateString();
    await ddb.send(new UpdateCommand({
      TableName: tables.dailyDeposits,
      Key: { userId, date },
      UpdateExpression: 'SET totalCredits = if_not_exists(totalCredits, :zero) + :amt',
      ExpressionAttributeValues: { ':amt': amountCredits, ':zero': 0 },
    }));
  }

  // ─── First deposit referral handling ─────────────────────────────────────
  private async handleFirstDeposit(userId: string): Promise<void> {
    const result = await ddb.send(new UpdateCommand({
      TableName: tables.users,
      Key: { userId },
      UpdateExpression: 'SET firstRealDeposit = :true, updatedAt = :now',
      ConditionExpression: 'firstRealDeposit = :false',
      ExpressionAttributeValues: {
        ':true': true,
        ':false': false,
        ':now': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    }));

    const user = result.Attributes as any;
    if (!user?.referredBy) return;

    // Credit referrer with bonus
    const bonus = config.referralBonusCredits;
    const referrerBalance = await this.creditBalance(user.referredBy, 'REAL', bonus);
    await this.recordTransaction({
      userId: user.referredBy,
      walletMode: 'REAL',
      type: 'REFERRAL_BONUS',
      amount: bonus,
      balanceAfter: referrerBalance,
      referenceId: userId,
      description: `Referral bonus for inviting ${user.username}`,
    });
  }
}

export const walletService = new WalletService();
