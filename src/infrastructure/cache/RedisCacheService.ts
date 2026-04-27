import { injectable } from 'tsyringe';
import { redisClient } from './redis-client';
import { logger } from '@shared/logger';

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  setnx(key: string, value: unknown, ttlSeconds?: number): Promise<boolean>;
  getTTL(key: string): Promise<number>;
}

@injectable()
export class RedisCacheService implements ICacheService {
  private readonly prefix = 'chat:';

  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.getFullKey(key);
      const data = await redisClient.get(fullKey);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as T;
    } catch (error) {
      logger.error({ error, key }, 'Failed to get from cache');
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      const data = JSON.stringify(value);

      if (ttlSeconds) {
        await redisClient.setex(fullKey, ttlSeconds, data);
      } else {
        await redisClient.set(fullKey, data);
      }
    } catch (error) {
      logger.error({ error, key }, 'Failed to set cache');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      await redisClient.del(fullKey);
    } catch (error) {
      logger.error({ error, key }, 'Failed to delete from cache');
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const fullKey = this.getFullKey(key);
      const result = await redisClient.exists(fullKey);
      return result === 1;
    } catch (error) {
      logger.error({ error, key }, 'Failed to check cache existence');
      return false;
    }
  }

  async setnx(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    try {
      const fullKey = this.getFullKey(key);
      const data = JSON.stringify(value);

      const result = await redisClient.setnx(fullKey, data);

      if (result === 1 && ttlSeconds) {
        await redisClient.expire(fullKey, ttlSeconds);
      }

      return result === 1;
    } catch (error) {
      logger.error({ error, key }, 'Failed to setnx cache');
      return false;
    }
  }

  async getTTL(key: string): Promise<number> {
    try {
      const fullKey = this.getFullKey(key);
      return await redisClient.ttl(fullKey);
    } catch (error) {
      logger.error({ error, key }, 'Failed to get TTL');
      return -1;
    }
  }
}
