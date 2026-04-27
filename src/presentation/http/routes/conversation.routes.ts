import type { FastifyInstance } from 'fastify';
import { ConversationController } from '../controllers/ConversationController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { container } from '@shared/container';

export async function conversationRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = container.resolve(ConversationController);

  // Create a new conversation
  fastify.post(
    '/conversations',
    {
      preHandler: authMiddleware,
      schema: {
        tags: ['Conversations'],
        description: 'Create a new conversation between matched users',
        body: {
          type: 'object',
          required: ['userAId', 'userBId'],
          properties: {
            userAId: { type: 'string' },
            userBId: { type: 'string' },
            matchId: { type: 'string' },
          },
        },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request: any, reply: any) => controller.create(request, reply)
  );

  // List user's conversations
  fastify.get(
    '/conversations',
    {
      preHandler: authMiddleware,
      schema: {
        tags: ['Conversations'],
        description: 'List all conversations for the authenticated user',
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request: any, reply: any) => controller.list(request, reply)
  );

  // Get conversation by ID
  fastify.get(
    '/conversations/:conversationId',
    {
      preHandler: authMiddleware,
      schema: {
        tags: ['Conversations'],
        description: 'Get conversation details by ID',
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request: any, reply: any) => controller.get(request, reply)
  );
}
