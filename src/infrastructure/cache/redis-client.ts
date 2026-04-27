import Redis from 'ioredis';
import { redisConfig } from '@shared/config';
import { logger } from '@shared/logger';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redisClient =
  globalForRedis.redis ??
  new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

redisClient.on('connect', () => {
  logger.info({ host: redisConfig.host, port: redisConfig.port }, 'Redis client connected');
});

redisClient.on('error', (error) => {
  logger.error({ error }, 'Redis client error');
});

redisClient.on('close', () => {
  logger.warn('Redis client connection closed');
});

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redisClient;
}

export async function disconnectRedis(): Promise<void> {
  await redisClient.quit();
  logger.info('Redis client disconnected');
}

export async function connectRedis(): Promise<void> {
  try {
    await redisClient.ping();
    logger.info('Redis connection verified');
  } catch (error) {
    // In development, allow the service to start without Redis
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Redis not available - running without cache/presence features');
      return;
    }
    logger.error({ error }, 'Failed to connect to Redis');
    throw error;
  }
}
