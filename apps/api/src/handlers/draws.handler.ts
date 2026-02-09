import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';
import { errorHandler } from '../middleware/error.middleware';
import drawRoutes from '../routes/draws';
import { config } from '../lib/config';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/draws', drawRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, fn: 'draws', stage: config.stage, timestamp: new Date().toISOString() });
});

app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: (err as any).errors?.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }
  next(err);
});

app.use(errorHandler);

export const handler = serverless(app);
