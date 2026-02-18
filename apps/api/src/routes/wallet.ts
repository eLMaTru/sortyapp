import { Router } from 'express';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { WithdrawalRequestSchema, CreateDepositRequestSchema, VerifyMetaMaskDepositSchema, DEPOSIT_METHODS } from '@sortyapp/shared';
import { walletService } from '../services/wallet.service';
import { depositService } from '../services/deposit.service';
import { userService } from '../services/user.service';
import { polygonService } from '../services/polygon.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { ddb, tables } from '../lib/dynamo';

const router = Router();

router.get('/transactions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const transactions = await walletService.getTransactions(req.user!.userId);
    res.json({ success: true, data: transactions });
  } catch (err) { next(err); }
});

router.post('/withdraw', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = WithdrawalRequestSchema.parse(req.body);
    const paymentDetails = body.method !== 'POLYGON' ? {
      ...(body.binancePayId && { binancePayId: body.binancePayId }),
      ...(body.paypalEmail && { paypalEmail: body.paypalEmail }),
      ...(body.accountNumber && { accountNumber: body.accountNumber }),
      ...(body.accountHolder && { accountHolder: body.accountHolder }),
    } : undefined;
    const withdrawal = await walletService.requestWithdrawal(
      req.user!.userId,
      body.amountCredits,
      body.method,
      body.walletAddress,
      paymentDetails,
    );
    res.status(201).json({ success: true, data: withdrawal });
  } catch (err) { next(err); }
});

router.post('/withdrawals/:id/cancel', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const withdrawal = await walletService.cancelWithdrawal(req.user!.userId, req.params.id);
    res.json({ success: true, data: withdrawal });
  } catch (err) { next(err); }
});

router.get('/withdrawals', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const withdrawals = await walletService.getWithdrawals(req.user!.userId);
    res.json({ success: true, data: withdrawals });
  } catch (err) { next(err); }
});

// ─── Deposit requests (manual recharge) ─────────────────────────────────────
router.get('/deposit-methods', authenticate, async (_req: AuthRequest, res, next) => {
  try {
    // Fetch DOP rate and payment methods config in parallel
    let dopRate = 0;
    let paymentConfig: Record<string, { deposit: boolean; withdraw: boolean }> | null = null;
    try {
      const [rateResult, configResult] = await Promise.all([
        ddb.send(new GetCommand({ TableName: tables.cache, Key: { pk: 'CONFIG', sk: 'DOP_RATE' } })),
        ddb.send(new GetCommand({ TableName: tables.cache, Key: { pk: 'CONFIG', sk: 'PAYMENT_METHODS' } })),
      ]);
      dopRate = rateResult.Item?.rate ?? 0;
      paymentConfig = configResult.Item?.methods ?? null;
    } catch { /* defaults */ }

    // Filter deposit methods by enabled config
    const enabledMethods = paymentConfig
      ? DEPOSIT_METHODS.filter(m => paymentConfig![m.method]?.deposit !== false)
      : DEPOSIT_METHODS;

    // Build enabled withdrawal methods list
    const allWithdrawMethods = ['BINANCE', 'PAYPAL', 'BANK_POPULAR', 'BANK_BHD', 'POLYGON'];
    const enabledWithdrawMethods = paymentConfig
      ? allWithdrawMethods.filter(m => paymentConfig![m]?.withdraw !== false)
      : allWithdrawMethods;

    res.json({ success: true, data: { methods: enabledMethods, dopRate, withdrawMethods: enabledWithdrawMethods } });
  } catch (err) { next(err); }
});

router.post('/deposit-request', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = CreateDepositRequestSchema.parse(req.body);
    const user = await userService.getById(req.user!.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const deposit = await depositService.create(
      user.userId,
      user.username,
      body.method,
      body.amountUSDC,
      body.reference,
      body.code,
    );
    res.status(201).json({ success: true, data: deposit });
  } catch (err) { next(err); }
});

router.get('/deposit-requests', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const deposits = await depositService.getUserDeposits(req.user!.userId);
    res.json({ success: true, data: deposits });
  } catch (err) { next(err); }
});

// ─── MetaMask on-chain deposit verification ─────────────────────────────────
router.post('/deposit-metamask', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = VerifyMetaMaskDepositSchema.parse(req.body);
    const user = await userService.getById(req.user!.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Verify the on-chain transaction
    const verified = await polygonService.verifyUSDCTransfer(
      body.txHash,
      body.amountUSDC,
      body.senderAddress,
    );

    // Create deposit record (APPROVED) + credit balance
    const deposit = await depositService.createVerifiedMetaMask(
      user.userId,
      user.username,
      verified.amountUSDC,
      body.txHash,
      body.senderAddress,
    );

    res.status(201).json({ success: true, data: deposit });
  } catch (err) { next(err); }
});

export default router;
