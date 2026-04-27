import { injectable } from 'tsyringe';
import { redisClient } from './redis-client';
import { logger } from '@shared/logger';
import { IPresenceRepository, UserPresence } from '@domain/repositories';
import { PresenceStatus, LastSeen } from '@domain/value-objects';

const PRESENCE_TTL = 300; // 5 minutes
const TYPING_TTL = 10; // 10 seconds

@injectable()
export class PresenceRepository implements IPresenceRepository {
  private readonly keys = {
    userPresence: (userId: string) => `presence:user:${userId}`,
    userSockets: (userId: string) => `presence:user:${userId}:sockets`,
    socketToUser: (socketId: string) => `presence:socket:${socketId}`,
    onlineUsers: () => 'presence:online',
    typingUsers: (conversationId: string) => `typing:${conversationId}`,
  };

  async setOnline(userId: string, socketId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      const presenceData = {
        userId,
        status: 'ONLINE',
        lastSeen: now,
        socketId,
      };

      // Store user presence
      await redisClient.setex(
        this.keys.userPresence(userId),
        PRESENCE_TTL,
        JSON.stringify(presenceData)
      );

      // Add socket to user's socket set
      await redisClient.sadd(this.keys.userSockets(userId), socketId);
      await redisClient.expire(this.keys.userSockets(userId), PRESENCE_TTL);

      // Map socket to user
      await redisClient.setex(this.keys.socketToUser(socketId), PRESENCE_TTL, userId);

      // Add to online users set
      await redisClient.sadd(this.keys.onlineUsers(), userId);

      logger.debug({ userId, socketId }, 'User set online');
    } catch (error) {
      logger.error({ error, userId, socketId }, 'Failed to set user online');
      throw error;
    }
  }

  async setOffline(userId: string, socketId?: string): Promise<void> {
    try {
      if (socketId) {
        // Remove specific socket
        await redisClient.srem(this.keys.userSockets(userId), socketId);
        await redisClient.del(this.keys.socketToUser(socketId));

        // Check if user has any remaining sockets
        const remainingSockets = await redisClient.scard(this.keys.userSockets(userId));

        if (remainingSockets === 0) {
          // No more connections, set user as offline
          await this.setOfflineStatus(userId);
        }
      } else {
        // Remove all sockets and set offline
        const sockets = await this.getSocketIds(userId);
        for (const sid of sockets) {
          await redisClient.del(this.keys.socketToUser(sid));
        }
        await redisClient.del(this.keys.userSockets(userId));
        await this.setOfflineStatus(userId);
      }

      logger.debug({ userId, socketId }, 'User set offline');
    } catch (error) {
      logger.error({ error, userId, socketId }, 'Failed to set user offline');
      throw error;
    }
  }

  private async setOfflineStatus(userId: string): Promise<void> {
    const now = new Date().toISOString();
    const presenceData = {
      userId,
      status: 'OFFLINE',
      lastSeen: now,
    };

    // Keep offline status for 24 hours
    await redisClient.setex(this.keys.userPresence(userId), 86400, JSON.stringify(presenceData));

    // Remove from online users
    await redisClient.srem(this.keys.onlineUsers(), userId);
  }

  async getPresence(userId: string): Promise<UserPresence | null> {
    try {
      const data = await redisClient.get(this.keys.userPresence(userId));

      if (!data) {
        // No presence data, return offline
        return {
          userId,
          status: PresenceStatus.offline(),
          lastSeen: LastSeen.fromDate(new Date()),
        };
      }

      const parsed = JSON.parse(data) as {
        userId: string;
        status: string;
        lastSeen: string;
        socketId?: string;
      };

      return {
        userId: parsed.userId,
        status: this.statusFromString(parsed.status),
        lastSeen: LastSeen.fromDate(new Date(parsed.lastSeen)),
        socketId: parsed.socketId,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get user presence');
      return null;
    }
  }

  async getMultiplePresence(userIds: string[]): Promise<Map<string, UserPresence>> {
    const result = new Map<string, UserPresence>();

    try {
      const pipeline = redisClient.pipeline();
      for (const userId of userIds) {
        pipeline.get(this.keys.userPresence(userId));
      }

      const results = await pipeline.exec();

      for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i];
        const [error, data] = results![i];

        if (error || !data) {
          result.set(userId, {
            userId,
            status: PresenceStatus.offline(),
            lastSeen: LastSeen.fromDate(new Date()),
          });
          continue;
        }

        const parsed = JSON.parse(data as string) as {
          userId: string;
          status: string;
          lastSeen: string;
          socketId?: string;
        };

        result.set(userId, {
          userId: parsed.userId,
          status: this.statusFromString(parsed.status),
          lastSeen: LastSeen.fromDate(new Date(parsed.lastSeen)),
          socketId: parsed.socketId,
        });
      }
    } catch (error) {
      logger.error({ error, userIds }, 'Failed to get multiple presence');
    }

    return result;
  }

  async updateLastSeen(userId: string): Promise<void> {
    try {
      const current = await this.getPresence(userId);
      const now = new Date().toISOString();

      const presenceData = {
        userId,
        status: current?.status.isOnline ? 'ONLINE' : 'OFFLINE',
        lastSeen: now,
        socketId: current?.socketId,
      };

      await redisClient.setex(
        this.keys.userPresence(userId),
        PRESENCE_TTL,
        JSON.stringify(presenceData)
      );
    } catch (error) {
      logger.error({ error, userId }, 'Failed to update last seen');
    }
  }

  async getOnlineUsers(): Promise<string[]> {
    try {
      return await redisClient.smembers(this.keys.onlineUsers());
    } catch (error) {
      logger.error({ error }, 'Failed to get online users');
      return [];
    }
  }

  async getSocketIds(userId: string): Promise<string[]> {
    try {
      return await redisClient.smembers(this.keys.userSockets(userId));
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get socket IDs');
      return [];
    }
  }

  async removeSocket(socketId: string): Promise<void> {
    try {
      const userId = await redisClient.get(this.keys.socketToUser(socketId));

      if (userId) {
        await this.setOffline(userId, socketId);
      } else {
        await redisClient.del(this.keys.socketToUser(socketId));
      }
    } catch (error) {
      logger.error({ error, socketId }, 'Failed to remove socket');
    }
  }

  async setTyping(conversationId: string, userId: string): Promise<void> {
    try {
      await redisClient.setex(
        `${this.keys.typingUsers(conversationId)}:${userId}`,
        TYPING_TTL,
        new Date().toISOString()
      );
    } catch (error) {
      logger.error({ error, conversationId, userId }, 'Failed to set typing');
    }
  }

  async removeTyping(conversationId: string, userId: string): Promise<void> {
    try {
      await redisClient.del(`${this.keys.typingUsers(conversationId)}:${userId}`);
    } catch (error) {
      logger.error({ error, conversationId, userId }, 'Failed to remove typing');
    }
  }

  async getTypingUsers(conversationId: string): Promise<string[]> {
    try {
      const pattern = `${this.keys.typingUsers(conversationId)}:*`;
      const keys = await redisClient.keys(pattern);

      const typingUsers: string[] = [];
      const now = Date.now();

      for (const key of keys) {
        const userId = key.split(':').pop();
        if (userId) {
          const timestamp = await redisClient.get(key);
          if (timestamp) {
            const typingTime = new Date(timestamp).getTime();
            // Check if typing indicator is still valid (within TTL)
            if (now - typingTime < TYPING_TTL * 1000) {
              typingUsers.push(userId);
            }
          }
        }
      }

      return typingUsers;
    } catch (error) {
      logger.error({ error, conversationId }, 'Failed to get typing users');
      return [];
    }
  }

  async updateStatus(userId: string, status: PresenceStatus): Promise<void> {
    try {
      const current = await this.getPresence(userId);
      const now = new Date().toISOString();

      const statusStr = status.isOnline ? 'ONLINE' : status.isAway ? 'AWAY' : 'OFFLINE';

      const presenceData = {
        userId,
        status: statusStr,
        lastSeen: now,
        socketId: current?.socketId,
      };

      await redisClient.setex(
        this.keys.userPresence(userId),
        PRESENCE_TTL,
        JSON.stringify(presenceData)
      );

      if (status.isOnline) {
        await redisClient.sadd(this.keys.onlineUsers(), userId);
      } else {
        await redisClient.srem(this.keys.onlineUsers(), userId);
      }
    } catch (error) {
      logger.error({ error, userId }, 'Failed to update status');
    }
  }

  private statusFromString(status: string): PresenceStatus {
    switch (status) {
      case 'ONLINE':
        return PresenceStatus.online();
      case 'AWAY':
        return PresenceStatus.away();
      case 'OFFLINE':
      default:
        return PresenceStatus.offline();
    }
  }
}
