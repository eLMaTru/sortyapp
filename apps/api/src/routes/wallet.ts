import { Router } from 'express';
import { WithdrawalRequestSchema, CreateDepositRequestSchema, DEPOSIT_METHODS } from '@sortyapp/shared';
import { walletService } from '../services/wallet.service';
import { depositService } from '../services/deposit.service';
import { userService } from '../services/user.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

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
    const withdrawal = await walletService.requestWithdrawal(
      req.user!.userId,
      body.amountCredits,
      body.walletAddress,
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
    res.json({ success: true, data: DEPOSIT_METHODS });
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

export default router;
