import { Router } from 'express';
import { WithdrawalRequestSchema } from '@sortyapp/shared';
import { walletService } from '../services/wallet.service';
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

export default router;
