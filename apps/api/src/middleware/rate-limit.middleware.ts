import { Request, Response, NextFunction } from 'express';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, tables } from '../lib/dynamo';

interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  login: { maxAttempts: 5, windowMinutes: 15 },
  register: { maxAttempts: 3, windowMinutes: 60 },
};

/**
 * DynamoDB-based rate limiting middleware.
 * Tracks attempts per IP per action in the cache table with TTL auto-cleanup.
 */
export function rateLimit(action: string) {
  const limit = RATE_LIMITS[action] || { maxAttempts: 10, windowMinutes: 15 };

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
    const pk = `RATE#${ip}`;
    const sk = action;
    const now = Date.now();
    const cutoff = now - limit.windowMinutes * 60 * 1000;
    const ttl = Math.floor(now / 1000) + limit.windowMinutes * 60;

    try {
      // Try to increment within an active window
      const result = await ddb.send(new UpdateCommand({
        TableName: tables.cache,
        Key: { pk, sk },
        UpdateExpression: 'SET attempts = if_not_exists(attempts, :zero) + :one, expiresAt = :ttl',
        ConditionExpression: 'attribute_exists(windowStart) AND windowStart > :cutoff',
        ExpressionAttributeValues: {
          ':one': 1,
          ':zero': 0,
          ':ttl': ttl,
          ':cutoff': cutoff,
        },
        ReturnValues: 'ALL_NEW',
      }));

      const attempts = (result.Attributes as any).attempts;
      if (attempts > limit.maxAttempts) {
        res.status(429).json({
          success: false,
          error: `Too many attempts. Try again in ${limit.windowMinutes} minutes.`,
        });
        return;
      }

      next();
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') {
        // Window expired or first request from this IP — start new window
        await ddb.send(new UpdateCommand({
          TableName: tables.cache,
          Key: { pk, sk },
          UpdateExpression: 'SET attempts = :one, windowStart = :now, expiresAt = :ttl',
          ExpressionAttributeValues: {
            ':one': 1,
            ':now': now,
            ':ttl': ttl,
          },
        }));
        next();
      } else {
        // Rate limiting error — fail open (don't block legitimate users)
        console.error('[RATE_LIMIT] Error:', err);
        next();
      }
    }
  };
}
