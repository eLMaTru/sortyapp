import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import { errorHandler } from '../middleware/error.middleware';
import authRoutes from '../routes/auth';
import { config } from '../lib/config';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, fn: 'auth', stage: config.stage, timestamp: new Date().toISOString() });
});

app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
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

app.use(errorHandler);

export const handler = serverless(app);
