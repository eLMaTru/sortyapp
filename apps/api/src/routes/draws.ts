import { Router } from 'express';
import { JoinDrawSchema, ListDrawsQuerySchema, WalletMode } from '@sortyapp/shared';
import { drawService } from '../services/draw.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/templates', async (_req, res, next) => {
  try {
    const templates = await drawService.getTemplates();
    res.json({ success: true, data: templates });
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

export default router;
