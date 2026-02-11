import { Router } from 'express';
import { QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { RegisterSchema, LoginSchema, UpdateWalletAddressSchema } from '@sortyapp/shared';
import { userService } from '../services/user.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';
import { ddb, tables } from '../lib/dynamo';

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

router.put('/payment-details', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { method, details } = req.body;
    if (!method || !details || typeof details !== 'object') {
      return res.status(400).json({ success: false, error: 'method and details required' });
    }
    await userService.savePaymentDetails(req.user!.userId, method, details);
    res.json({ success: true, message: 'Payment details saved' });
  } catch (err) { next(err); }
});

// ─── Notifications (expired draws, etc.) ─────────────────────────────────
router.get('/notifications', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await ddb.send(new QueryCommand({
      TableName: tables.cache,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': `NOTIFICATION#${req.user!.userId}` },
    }));
    res.json({ success: true, data: result.Items || [] });
  } catch (err) { next(err); }
});

router.post('/notifications/dismiss', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await ddb.send(new QueryCommand({
      TableName: tables.cache,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': `NOTIFICATION#${req.user!.userId}` },
    }));
    // Delete all notifications for this user
    for (const item of result.Items || []) {
      await ddb.send(new DeleteCommand({
        TableName: tables.cache,
        Key: { pk: item.pk, sk: item.sk },
      }));
    }
    res.json({ success: true, message: 'Notifications dismissed' });
  } catch (err) { next(err); }
});

export default router;
