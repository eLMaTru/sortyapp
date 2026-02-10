import { Router } from 'express';
import { RegisterSchema, LoginSchema, UpdateWalletAddressSchema } from '@sortyapp/shared';
import { userService } from '../services/user.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

router.post('/register', rateLimit('register'), async (req, res, next) => {
  try {
    const body = RegisterSchema.parse(req.body);
    const result = await userService.register(body.email, body.username, body.password, body.referralCode);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/login', rateLimit('login'), async (req, res, next) => {
  try {
    const body = LoginSchema.parse(req.body);
    const result = await userService.login(body.email, body.password);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await userService.getPublicById(req.user!.userId);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.put('/wallet-address', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = UpdateWalletAddressSchema.parse(req.body);
    await userService.updateWalletAddress(req.user!.userId, body.walletAddress);
    res.json({ success: true, message: 'Wallet address updated' });
  } catch (err) { next(err); }
});

export default router;
