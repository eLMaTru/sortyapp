import { Router } from 'express';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  SimulateDepositSchema,
  ApproveWithdrawalSchema,
  CreateTemplateSchema,
  UpdateTemplateSchema,
  ReviewDepositRequestSchema,
} from '@sortyapp/shared';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware';
import { walletService } from '../services/wallet.service';
import { depositService } from '../services/deposit.service';
import { drawService } from '../services/draw.service';
import { userService } from '../services/user.service';
import { metricsService } from '../services/metrics.service';
import { ddb, tables } from '../lib/dynamo';

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, requireRole('ADMIN'));

// ─── Users ─────────────────────────────────────────────────────────────────
router.get('/users', async (_req, res, next) => {
  try {
    const users = await userService.listAll();
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
});

// ─── Simulate deposit ──────────────────────────────────────────────────────
router.post('/simulate-deposit', async (req, res, next) => {
  try {
    const body = SimulateDepositSchema.parse(req.body);
    const result = await walletService.simulateDeposit(body.userId, body.amountCredits);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ─── Withdrawals ───────────────────────────────────────────────────────────
router.get('/withdrawals', async (_req, res, next) => {
  try {
    const withdrawals = await walletService.listPendingWithdrawals();
    res.json({ success: true, data: withdrawals });
  } catch (err) { next(err); }
});

router.post('/withdrawals/approve', async (req, res, next) => {
  try {
    const body = ApproveWithdrawalSchema.parse(req.body);
    const withdrawal = await walletService.approveWithdrawal(body.withdrawalId, body.txHash);
    res.json({ success: true, data: withdrawal });
  } catch (err) { next(err); }
});

// ─── Deposit requests (manual recharge) ─────────────────────────────────────
router.get('/deposit-requests', async (_req, res, next) => {
  try {
    const deposits = await depositService.listPending();
    res.json({ success: true, data: deposits });
  } catch (err) { next(err); }
});

router.post('/deposit-requests/review', async (req: AuthRequest, res, next) => {
  try {
    const body = ReviewDepositRequestSchema.parse(req.body);
    let deposit;
    if (body.action === 'APPROVE') {
      deposit = await depositService.approve(body.depositRequestId, req.user!.userId, body.adminNote);
    } else {
      deposit = await depositService.reject(body.depositRequestId, req.user!.userId, body.adminNote);
    }
    res.json({ success: true, data: deposit });
  } catch (err) { next(err); }
});

// ─── Templates ─────────────────────────────────────────────────────────────
router.get('/templates', async (_req, res, next) => {
  try {
    const templates = await drawService.getTemplates();
    res.json({ success: true, data: templates });
  } catch (err) { next(err); }
});

router.post('/templates', async (req, res, next) => {
  try {
    const body = CreateTemplateSchema.parse(req.body);
    const template = await drawService.createTemplate(body);
    // Create initial open draws for this template
    await drawService.createDrawForTemplate(template, 'DEMO');
    await drawService.createDrawForTemplate(template, 'REAL');
    res.status(201).json({ success: true, data: template });
  } catch (err) { next(err); }
});

router.put('/templates', async (req, res, next) => {
  try {
    const body = UpdateTemplateSchema.parse(req.body);
    await drawService.updateTemplate(body.templateId, body);
    res.json({ success: true, message: 'Template updated' });
  } catch (err) { next(err); }
});

// ─── Draws (admin view) ────────────────────────────────────────────────────
router.get('/draws', async (req, res, next) => {
  try {
    const mode = (req.query.mode as string) || 'REAL';
    const draws = await drawService.listDraws(mode as any);
    res.json({ success: true, data: draws });
  } catch (err) { next(err); }
});

router.post('/draws/:drawId/force-finalize', async (req, res, next) => {
  try {
    const draw = await drawService.forceFinalize(req.params.drawId);
    res.json({ success: true, data: draw });
  } catch (err) { next(err); }
});

// ─── Simulate join (dev/testing) ──────────────────────────────────────────
router.post('/draws/:drawId/simulate-join', async (req, res, next) => {
  try {
    const draw = await drawService.joinDraw(req.body.userId, req.params.drawId);
    res.json({ success: true, data: draw });
  } catch (err) { next(err); }
});

// ─── Metrics ──────────────────────────────────────────────────────────────
router.get('/metrics', async (_req, res, next) => {
  try {
    const metrics = await metricsService.getAdminMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) { next(err); }
});

// ─── Ensure open draws ─────────────────────────────────────────────────────
router.post('/ensure-open-draws', async (_req, res, next) => {
  try {
    await drawService.ensureOpenDraws();
    res.json({ success: true, message: 'Open draws ensured for all templates' });
  } catch (err) { next(err); }
});

// ─── DOP Exchange Rate ────────────────────────────────────────────────────
router.get('/dop-rate', async (_req, res, next) => {
  try {
    const result = await ddb.send(new GetCommand({
      TableName: tables.cache,
      Key: { pk: 'CONFIG', sk: 'DOP_RATE' },
    }));
    const rate = result.Item?.rate ?? 0;
    res.json({ success: true, data: { rate } });
  } catch (err) { next(err); }
});

router.put('/dop-rate', async (req, res, next) => {
  try {
    const rate = parseFloat(req.body.rate);
    if (isNaN(rate) || rate <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid rate' });
    }
    await ddb.send(new PutCommand({
      TableName: tables.cache,
      Item: { pk: 'CONFIG', sk: 'DOP_RATE', rate, updatedAt: new Date().toISOString() },
    }));
    res.json({ success: true, data: { rate } });
  } catch (err) { next(err); }
});

export default router;
