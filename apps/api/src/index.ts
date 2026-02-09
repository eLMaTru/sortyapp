import express from 'express';
import cors from 'cors';
import { config } from './lib/config';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth';
import drawRoutes from './routes/draws';
import walletRoutes from './routes/wallet';
import adminRoutes from './routes/admin';
import webhookRoutes from './routes/webhooks';
import { ZodError } from 'zod';

const app = express();

app.use(cors());
app.use(express.json());

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/draws', drawRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, stage: config.stage, timestamp: new Date().toISOString() });
});

// ─── Zod validation error handler ──────────────────────────────────────────
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }
  next(err);
});

// ─── Global error handler ──────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start server (local dev) ──────────────────────────────────────────────
if (process.env.NODE_ENV !== 'lambda') {
  app.listen(config.port, () => {
    console.log(`[API] SORTYAPP API running on http://localhost:${config.port}`);
    console.log(`[API] Stage: ${config.stage}`);
  });
}

export default app;
