import serverless from 'serverless-http';
import app from './index';

process.env.NODE_ENV = 'lambda';

export const handler = serverless(app);
