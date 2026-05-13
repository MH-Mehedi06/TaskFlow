import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

const createRedisClient = (name: string) => {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 100, 3000),
    lazyConnect: false,
  });
  client.on('connect', () => logger.info(`Redis ${name} connected`));
  client.on('error', (err) => logger.error(`Redis ${name} error`, err));
  client.on('reconnecting', () => logger.warn(`Redis ${name} reconnecting...`));
  return client;
};

export const redis = createRedisClient('main');
export const redisPub = createRedisClient('pub');
export const redisSub = createRedisClient('sub');
