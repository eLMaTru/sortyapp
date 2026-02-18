import { GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomBytes } from 'crypto';
import { v4 as uuid } from 'uuid';
import {
  DepositRequest,
  DepositRequestStatus,
  DepositMethod,
  CREDITS_PER_USDC,
  MAX_DAILY_DEPOSIT_USDC,
  DEPOSIT_EXPIRY_HOURS,
  creditsToUSDC,
  todayDateString,
} from '@sortyapp/shared';
import { ddb, tables } from '../lib/dynamo';
import { AppError } from '../middleware/error.middleware';
import { walletService } from './wallet.service';

function generateDepositCode(): string {
  return `DEP-${randomBytes(2).toString('hex').toUpperCase()}`;
}

class DepositService {
  async create(userId: string, username: string, method: DepositMethod, amountUSDC: number, reference?: string, code?: string): Promise<DepositRequest> {
    // Check daily limit
    await this.checkDailyLimit(userId, amountUSDC);

    // Check for existing PENDING requests (max 3 at a time)
    const pending = await this.getUserPending(userId);
    if (pending.length >= 3) {
      throw new AppError(400, 'You already have 3 pending deposit requests. Wait for them to be processed or let them expire.');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + DEPOSIT_EXPIRY_HOURS * 60 * 60 * 1000);
    const amountCredits = Math.round(amountUSDC * CREDITS_PER_USDC);

    const deposit: DepositRequest = {
      depositRequestId: uuid(),
      userId,
      username,
      method,
      amountUSDC,
      amountCredits,
      code: code || generateDepositCode(),
      reference,
      status: 'PENDING',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: tables.depositRequests, Item: deposit }));
    return deposit;
  }

  async approve(depositRequestId: string, adminUserId: string, adminNote?: string): Promise<DepositRequest> {
    // Atomically transition PENDING → APPROVED
    const now = new Date().toISOString();
    let result;
    try {
      result = await ddb.send(new UpdateCommand({
        TableName: tables.depositRequests,
        Key: { depositRequestId },
        UpdateExpression: 'SET #status = :approved, reviewedBy = :admin, reviewedAt = :now, updatedAt = :now, adminNote = :note',
        ConditionExpression: '#status = :pending',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':approved': 'APPROVED',
          ':pending': 'PENDING',
          ':admin': adminUserId,
          ':now': now,
          ':note': adminNote || null,
        },
        ReturnValues: 'ALL_NEW',
      }));
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') {
        throw new AppError(400, 'Deposit request is not in PENDING status');
      }
      throw err;
    }

    const deposit = result.Attributes as DepositRequest;

    // Credit user balance + record transaction + handle first deposit referral
    const newBalance = await walletService.creditBalance(deposit.userId, 'REAL', deposit.amountCredits);
    await walletService.recordTransaction({
      userId: deposit.userId,
      walletMode: 'REAL',
      type: 'DEPOSIT',
      amount: deposit.amountCredits,
      balanceAfter: newBalance,
      referenceId: depositRequestId,
      description: `Manual deposit via ${deposit.method}: ${deposit.amountUSDC} USDC`,
    });

    // Track daily deposit
    await this.trackDailyDeposit(deposit.userId, deposit.amountUSDC);

    // Handle first deposit referral bonus
    await this.handleFirstDeposit(deposit.userId);

    return deposit;
  }

  /**
   * Create a MetaMask deposit that's already verified on-chain.
   * Skips PENDING state — goes straight to APPROVED since blockchain is source of truth.
   */
  async createVerifiedMetaMask(
    userId: string,
    username: string,
    amountUSDC: number,
    txHash: string,
    senderAddress: string,
  ): Promise<DepositRequest> {
    await this.checkDailyLimit(userId, amountUSDC);
    await this.checkDuplicateTxHash(txHash);

    const now = new Date().toISOString();
    const amountCredits = Math.round(amountUSDC * CREDITS_PER_USDC);

    const deposit: DepositRequest = {
      depositRequestId: uuid(),
      userId,
      username,
      method: 'METAMASK',
      amountUSDC,
      amountCredits,
      code: `MM-${txHash.slice(2, 10).toUpperCase()}`,
      txHash,
      senderAddress,
      status: 'APPROVED',
      reviewedBy: 'SYSTEM_AUTO',
      reviewedAt: now,
      createdAt: now,
      updatedAt: now,
      expiresAt: now,
    };

    await ddb.send(new PutCommand({ TableName: tables.depositRequests, Item: deposit }));

    // Credit user balance
    const newBalance = await walletService.creditBalance(deposit.userId, 'REAL', deposit.amountCredits);
    await walletService.recordTransaction({
      userId: deposit.userId,
      walletMode: 'REAL',
      type: 'DEPOSIT',
      amount: deposit.amountCredits,
      balanceAfter: newBalance,
      referenceId: deposit.depositRequestId,
      description: `MetaMask USDC deposit: ${deposit.amountUSDC} USDC (tx: ${txHash.slice(0, 10)}...)`,
    });

    await this.trackDailyDeposit(deposit.userId, deposit.amountUSDC);
    await this.handleFirstDeposit(deposit.userId);

    return deposit;
  }

  private async checkDuplicateTxHash(txHash: string): Promise<void> {
    // Fast check via code-index GSI (code derived from txHash)
    const codeResult = await ddb.send(new QueryCommand({
      TableName: tables.depositRequests,
      IndexName: 'code-index',
      KeyConditionExpression: 'code = :code',
      ExpressionAttributeValues: { ':code': `MM-${txHash.slice(2, 10).toUpperCase()}` },
    }));
    if (codeResult.Items && codeResult.Items.length > 0) {
      throw new AppError(400, 'This transaction has already been used for a deposit');
    }

    // Secondary check: scan APPROVED deposits filtering by txHash
    const scanResult = await ddb.send(new QueryCommand({
      TableName: tables.depositRequests,
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :approved',
      FilterExpression: 'txHash = :hash',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':approved': 'APPROVED', ':hash': txHash },
    }));
    if (scanResult.Items && scanResult.Items.length > 0) {
      throw new AppError(400, 'This transaction has already been used for a deposit');
    }
  }

  async reject(depositRequestId: string, adminUserId: string, adminNote?: string): Promise<DepositRequest> {
    const now = new Date().toISOString();
    let result;
    try {
      result = await ddb.send(new UpdateCommand({
        TableName: tables.depositRequests,
        Key: { depositRequestId },
        UpdateExpression: 'SET #status = :rejected, reviewedBy = :admin, reviewedAt = :now, updatedAt = :now, adminNote = :note',
        ConditionExpression: '#status = :pending',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':rejected': 'REJECTED',
          ':pending': 'PENDING',
          ':admin': adminUserId,
          ':now': now,
          ':note': adminNote || null,
        },
        ReturnValues: 'ALL_NEW',
      }));
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') {
        throw new AppError(400, 'Deposit request is not in PENDING status');
      }
      throw err;
    }

    return result.Attributes as DepositRequest;
  }

  async expirePending(): Promise<number> {
    // Query all PENDING deposits
    const result = await ddb.send(new QueryCommand({
      TableName: tables.depositRequests,
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :pending',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':pending': 'PENDING' },
    }));

    const now = new Date().toISOString();
    let expired = 0;

    for (const item of result.Items || []) {
      const deposit = item as DepositRequest;
      if (deposit.expiresAt <= now) {
        try {
          await ddb.send(new UpdateCommand({
            TableName: tables.depositRequests,
            Key: { depositRequestId: deposit.depositRequestId },
            UpdateExpression: 'SET #status = :expired, updatedAt = :now',
            ConditionExpression: '#status = :pending',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':expired': 'EXPIRED',
              ':pending': 'PENDING',
              ':now': now,
            },
          }));
          expired++;
        } catch {
          // Already transitioned — skip
        }
      }
    }

    return expired;
  }

  async getById(depositRequestId: string): Promise<DepositRequest | undefined> {
    const result = await ddb.send(new GetCommand({
      TableName: tables.depositRequests,
      Key: { depositRequestId },
    }));
    return result.Item as DepositRequest | undefined;
  }

  async getUserDeposits(userId: string): Promise<DepositRequest[]> {
    const result = await ddb.send(new QueryCommand({
      TableName: tables.depositRequests,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      ScanIndexForward: false,
    }));
    return (result.Items || []) as DepositRequest[];
  }

  async listPending(): Promise<DepositRequest[]> {
    const result = await ddb.send(new QueryCommand({
      TableName: tables.depositRequests,
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :pending',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':pending': 'PENDING' },
      ScanIndexForward: false,
    }));
    return (result.Items || []) as DepositRequest[];
  }

  private async getUserPending(userId: string): Promise<DepositRequest[]> {
    const all = await this.getUserDeposits(userId);
    return all.filter((d) => d.status === 'PENDING');
  }

  private async checkDailyLimit(userId: string, amountUSDC: number): Promise<void> {
    // Sum today's APPROVED deposits
    const deposits = await this.getUserDeposits(userId);
    const today = todayDateString();
    const todayApproved = deposits.filter(
      (d) => d.status === 'APPROVED' && d.createdAt.startsWith(today)
    );
    const todayTotal = todayApproved.reduce((sum, d) => sum + d.amountUSDC, 0);

    // Also count PENDING (reserved amount)
    const todayPending = deposits.filter(
      (d) => d.status === 'PENDING' && d.createdAt.startsWith(today)
    );
    const pendingTotal = todayPending.reduce((sum, d) => sum + d.amountUSDC, 0);

    if (todayTotal + pendingTotal + amountUSDC > MAX_DAILY_DEPOSIT_USDC) {
      throw new AppError(400, `Daily deposit limit of $${MAX_DAILY_DEPOSIT_USDC} exceeded. Current: $${todayTotal + pendingTotal} (approved + pending)`);
    }
  }

  private async trackDailyDeposit(userId: string, amountUSDC: number): Promise<void> {
    const amountCredits = Math.round(amountUSDC * CREDITS_PER_USDC);
    const date = todayDateString();
    await ddb.send(new UpdateCommand({
      TableName: tables.dailyDeposits,
      Key: { userId, date },
      UpdateExpression: 'SET totalCredits = if_not_exists(totalCredits, :zero) + :amt',
      ExpressionAttributeValues: { ':amt': amountCredits, ':zero': 0 },
    }));
  }

  private async handleFirstDeposit(userId: string): Promise<void> {
    // Delegate to wallet service pattern — mark firstRealDeposit and grant referral bonus
    let result;
    try {
      result = await ddb.send(new UpdateCommand({
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
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') return;
      throw err;
    }

    const user = result.Attributes as any;
    if (!user?.referredBy) return;

    const bonus = parseInt(process.env.REFERRAL_BONUS_CREDITS || '500', 10);

    const referrerBalance = await walletService.creditBalance(user.referredBy, 'REAL', bonus);
    await walletService.recordTransaction({
      userId: user.referredBy,
      walletMode: 'REAL',
      type: 'REFERRAL_BONUS',
      amount: bonus,
      balanceAfter: referrerBalance,
      referenceId: userId,
      description: `Referral bonus for inviting ${user.username}`,
    });

    const userBalance = await walletService.creditBalance(userId, 'REAL', bonus);
    await walletService.recordTransaction({
      userId,
      walletMode: 'REAL',
      type: 'REFERRAL_BONUS',
      amount: bonus,
      balanceAfter: userBalance,
      referenceId: user.referredBy,
      description: 'Referral bonus for joining via referral',
    });
  }
}

export const depositService = new DepositService();
