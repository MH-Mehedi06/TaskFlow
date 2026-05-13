import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';

// Redis-backed response cache. Only use on public, non-user-specific endpoints.
export const cacheResponse = (ttl: number) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const key = `cache:${req.originalUrl}`;
  try {
    const cached = await redis.get(key);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.json(JSON.parse(cached));
      return;
    }
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      redis.setex(key, ttl, JSON.stringify(body)).catch(() => {});
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };
    next();
  } catch {
    next();
  }
};

// Tells the browser/CDN how long to cache the response.
export const httpCache = (seconds: number) =>
  (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${seconds * 2}`);
    next();
  };

// No-store for private/user-specific responses.
export const noCache = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};

// Invalidate all Redis cache keys matching a glob pattern.
export const invalidateCache = async (pattern: string): Promise<void> => {
  try {
    // Use SCAN to avoid blocking Redis on large key sets.
    let cursor = '0';
    const target = `cache:${pattern}`;
    const toDelete: string[] = [];
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', target, 'COUNT', 100);
      cursor = nextCursor;
      toDelete.push(...keys);
    } while (cursor !== '0');
    if (toDelete.length > 0) await redis.del(...toDelete);
  } catch {
    // Non-fatal: stale cache will expire on its own
  }
};
