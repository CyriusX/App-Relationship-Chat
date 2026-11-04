import { assertAccountActive } from '../privacy/AccountAccess';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { FastifyInstance } from 'fastify';
import { redisClient } from '@infrastructure/cache';
import { socketConfig, jwtConfig } from '@shared/config';
import { logger } from '@shared/logger';
import { verify } from 'jsonwebtoken';
import { container } from '@shared/container';
import { IPresenceRepository as PresenceRepositoryToken } from '@shared/container/tokens';
import type { IPresenceRepository } from '@domain/repositories';
import { ChatSocketHandlers } from '@presentation/websocket/handlers/ChatHandlers';

interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

let io: Server | null = null;
let matchSubscriber: ReturnType<typeof redisClient.duplicate> | null = null;

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

export async function createSocketServer(fastify: FastifyInstance): Promise<Server> {
  io = new Server(fastify.server, {
    cors: socketConfig.cors,
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
  });

  // Setup Redis adapter for multi-instance support
  try {
    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();

    await Promise.all([pubClient.ping(), subClient.ping()]);

    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.io Redis adapter configured');
  } catch (error) {
    logger.warn({ error }, 'Redis adapter failed, running without adapter');
  }

  // Authentication middleware
  matchSubscriber = redisClient.duplicate();
  matchSubscriber.on('message', (_channel, raw) => {
    try {
      const data = JSON.parse(raw) as { participants?: unknown };
      if (!Array.isArray(data.participants) || data.participants.length !== 2) return;
      for (const id of data.participants) {
        if (typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id))
          io?.local.to(`user:${id}`).emit('connections:changed', {});
      }
    } catch {
      /* Malformed hints never reach clients. */
    }
  });
  await matchSubscriber.subscribe('astrolovers:connections:changed');

  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verify(token, jwtConfig.secret) as JwtPayload;

      if (!decoded.userId) {
        return next(new Error('Invalid token'));
      }

      await assertAccountActive(decoded.userId);
      (socket as any).userId = decoded.userId;
      (socket as any).conversationRooms = new Set<string>();

      next();
    } catch (error) {
      logger.error({ error }, 'Socket authentication failed');
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', async (socket: Socket) => {
    const userId = (socket as any).userId as string;
    socket.use(async (_packet, next) => {
      try {
        await assertAccountActive(userId);
        next();
      } catch (error) {
        const inactive =
          typeof error === 'object' &&
          error !== null &&
          'statusCode' in error &&
          error.statusCode === 403;
        next(
          new Error(
            inactive ? 'User account is inactive' : 'Account validation temporarily unavailable'
          )
        );
        if (inactive) socket.disconnect(true);
      }
    });
    logger.info({ socketId: socket.id, userId }, 'Client connected');

    try {
      // Set user online
      const presenceRepository = container.resolve<IPresenceRepository>(PresenceRepositoryToken);
      await presenceRepository.setOnline(userId, socket.id);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Register chat handlers
      const handlers = container.resolve(ChatSocketHandlers);
      handlers.register(socket, io!);

      // Handle disconnect
      socket.on('disconnect', async (reason) => {
        logger.info({ socketId: socket.id, userId, reason }, 'Client disconnected');

        try {
          await presenceRepository.setOffline(userId, socket.id);

          io!.emit('presence:changed', {
            userId,
            status: 'OFFLINE',
            lastSeen: new Date().toISOString(),
          });
        } catch (error) {
          logger.error({ error, userId }, 'Failed to handle disconnect');
        }
      });

      // Notify others about presence change
      io!.emit('presence:changed', {
        userId,
        status: 'ONLINE',
        lastSeen: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ error, socketId: socket.id }, 'Failed to handle connection');
      socket.disconnect(true);
    }
  });

  logger.info('Socket.io server initialized');
  return io;
}

export async function closeSocketServer(): Promise<void> {
  if (matchSubscriber) {
    await matchSubscriber.quit();
    matchSubscriber = null;
  }
  if (io) {
    await new Promise<void>((resolve) => {
      io!.close(() => {
        logger.info('Socket.io server closed');
        resolve();
      });
    });
    io = null;
  }
}
