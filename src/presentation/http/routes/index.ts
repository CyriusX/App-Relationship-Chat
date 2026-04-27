import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.routes';
import { conversationRoutes } from './conversation.routes';
import { messageRoutes } from './message.routes';

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // Health check routes (no auth required)
  await fastify.register(healthRoutes);

  // API routes (require authentication)
  await fastify.register(async (instance) => {
    await instance.register(conversationRoutes);
    await instance.register(messageRoutes);
  }, { prefix: '/v1' });
}
