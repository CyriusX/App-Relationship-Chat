import 'reflect-metadata';
import { startInboxOutbox } from '@infrastructure/chat/outbox';
import { purgeAccount } from '@infrastructure/privacy/purgeAccount';
import { internalPrivacyAuth } from '@infrastructure/privacy/internalAuth';
import { z } from 'zod';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';

import { appConfig, jwtConfig } from '@shared/config';
import { logger, createLogger } from '@shared/logger';
import { errorHandler } from '@presentation/http/middlewares/error-handler.middleware';
import { registerRoutes } from '@presentation/http/routes';
import { createSocketServer, closeSocketServer } from '@infrastructure/websocket';
import { connectPrisma, disconnectPrisma } from '@infrastructure/database/client';
import { connectRedis, disconnectRedis } from '@infrastructure/cache';
import { setupContainer } from '@shared/container';

// Load environment variables
dotenv.config();

async function bootstrap() {
  const fastify = Fastify({
    logger: {
      level: appConfig.logLevel,
      transport: appConfig.isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              levelFirst: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  try {
    // Setup dependency injection
    setupContainer();

    // Register plugins
    await fastify.register(cors, {
      origin: true,
      credentials: true,
    });

    await fastify.register(jwt, {
      secret: jwtConfig.secret,
      sign: {
        expiresIn: jwtConfig.expiresIn,
      },
    });

    await fastify.register(rateLimit, {
      max: appConfig.rateLimit.max,
      timeWindow: appConfig.rateLimit.windowMs,
      allowList: ['127.0.0.1'],
    });

    // Swagger documentation (dev only)
    if (appConfig.isDevelopment) {
      await fastify.register(swagger, {
        openapi: {
          info: {
            title: 'Chat Service API',
            description: 'Real-time chat micro-service for RelationshipApp',
            version: '1.0.0',
          },
          servers: [
            {
              url: `http://localhost:${appConfig.port}`,
              description: 'Development server',
            },
          ],
        },
      });

      await fastify.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
          docExpansion: 'list',
          deepLinking: true,
        },
      });
    }

    // Register error handler
    fastify.setErrorHandler(errorHandler);

    fastify.delete(
      '/internal/users/:userId/data',
      { preHandler: internalPrivacyAuth },
      async (request, reply) => {
        const { userId } = z.object({ userId: z.string().uuid() }).parse(request.params);
        await purgeAccount(userId);
        return reply.code(204).send();
      }
    );

    // Register routes
    await fastify.register(registerRoutes);

    // Connect to external services
    await connectPrisma();
    await connectRedis();

    // Initialize Socket.io
    const inboxSocket = await createSocketServer(fastify);
    const stopInbox = startInboxOutbox(inboxSocket);
    fastify.addHook('onClose', async () => {
      stopInbox();
    });

    // Start server
    const address = await fastify.listen({
      port: appConfig.port,
      host: '0.0.0.0',
    });

    logger.info(
      {
        port: appConfig.port,
        env: appConfig.nodeEnv,
        docs: appConfig.isDevelopment ? `${address}/docs` : undefined,
      },
      'Chat service started'
    );

    // Graceful shutdown handlers
    const signals = ['SIGINT', 'SIGTERM'] as const;
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info({ signal }, 'Shutting down gracefully');

        try {
          await closeSocketServer();
          await fastify.close();
          await disconnectPrisma();
          await disconnectRedis();
          logger.info('Shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error({ error }, 'Error during shutdown');
          process.exit(1);
        }
      });
    });

    return fastify;
  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    await fastify.close();
    process.exit(1);
  }
}

// Start the server
bootstrap();
