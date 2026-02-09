import { Router } from 'express';
import { JoinDrawSchema, ListDrawsQuerySchema, SendChatMessageSchema, WalletMode } from '@sortyapp/shared';
import { drawService } from '../services/draw.service';
import { chatService } from '../services/chat.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/templates', async (_req, res, next) => {
  try {
    const templates = await drawService.getTemplates();
    res.json({ success: true, data: templates });
  } catch (err) { next(err); }
});

// Rankings (public endpoint)
router.get('/rankings', async (req, res, next) => {
  try {
    const mode = (req.query.mode as string) || 'DEMO';
    const rankings = await drawService.getRankings(mode as WalletMode);
    res.json({ success: true, data: rankings });
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const query = ListDrawsQuerySchema.parse({
      mode: req.query.mode,
      status: req.query.status || undefined,
    });
    const draws = await drawService.listDraws(query.mode as WalletMode, query.status as any);
    res.json({ success: true, data: draws });
  } catch (err) { next(err); }
});

router.get('/:drawId', async (req, res, next) => {
  try {
    const draw = await drawService.getDraw(req.params.drawId);
    if (!draw) {
      res.status(404).json({ success: false, error: 'Draw not found' });
      return;
    }
    // Hide serverSeed if draw is not completed
    if (draw.status !== 'COMPLETED') {
      draw.serverSeed = undefined;
      draw.revealedServerSeed = undefined;
    }
    res.json({ success: true, data: draw });
  } catch (err) { next(err); }
});

router.post('/join', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = JoinDrawSchema.parse(req.body);
    const draw = await drawService.joinDraw(req.user!.userId, body.drawId);
    res.json({ success: true, data: draw });
  } catch (err) { next(err); }
});

// ─── Chat ─────────────────────────────────────────────────────────────────
router.get('/:drawId/chat', async (req, res, next) => {
  try {
    const messages = await chatService.getMessages(req.params.drawId);
    res.json({ success: true, data: messages });
  } catch (err) { next(err); }
});

router.post('/:drawId/chat', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = SendChatMessageSchema.parse(req.body);
    const draw = await drawService.getDraw(req.params.drawId);
    if (!draw) {
      res.status(404).json({ success: false, error: 'Draw not found' });
      return;
    }
    // Verify user is a participant
    if (!draw.participants.includes(req.user!.userId)) {
      res.status(403).json({ success: false, error: 'Only participants can chat' });
      return;
    }
    const message = await chatService.sendMessage({
      drawId: req.params.drawId,
      userId: req.user!.userId,
      username: draw.participantUsernames[req.user!.userId] || req.user!.email,
      content: body.content,
      drawStatus: draw.status,
      drawCompletedAt: draw.completedAt,
    });
    res.status(201).json({ success: true, data: message });
  } catch (err) { next(err); }
});

export default router;
