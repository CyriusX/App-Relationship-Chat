import { SendMessageUseCase } from '@application/use-cases/message/SendMessageUseCase';
import type { FastifyInstance } from 'fastify';
import { MessageController } from '../controllers/MessageController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { container } from '@shared/container';
import {
  IConversationRepository as ConversationRepositoryToken,
  IMessageRepository as MessageRepositoryToken,
} from '@shared/container/tokens';
import type { IConversationRepository, IMessageRepository } from '@domain/repositories';

export async function messageRoutes(fastify: FastifyInstance): Promise<void> {
  const conversationRepository = container.resolve<IConversationRepository>(
    ConversationRepositoryToken
  );
  const messageRepository = container.resolve<IMessageRepository>(MessageRepositoryToken);
  const controller = new MessageController(
    conversationRepository,
    messageRepository,
    container.resolve(SendMessageUseCase)
  );

  // Get messages for a conversation
  fastify.get(
    '/conversations/:conversationId/messages',
    {
      preHandler: authMiddleware,
      schema: {
        tags: ['Messages'],
        description: 'Get messages for a conversation',
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (request: any, reply: any) => {
      await controller.getMessages(request, reply);
    }
  );

  // Send a message
  fastify.post(
    '/conversations/:conversationId/messages',
    {
      preHandler: authMiddleware,
      schema: {
        tags: ['Messages'],
        description: 'Send a message to a conversation',
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (request: any, reply: any) => {
      await controller.sendMessage(request, reply);
    }
  );

  // Edit a message
  fastify.patch(
    '/messages/:messageId',
    {
      preHandler: authMiddleware,
      schema: {
        tags: ['Messages'],
        description: 'Edit a message',
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (request: any, reply: any) => {
      await controller.editMessage(request, reply);
    }
  );

  // Delete a message (soft delete)
  fastify.delete(
    '/messages/:messageId',
    {
      preHandler: authMiddleware,
      schema: {
        tags: ['Messages'],
        description: 'Soft delete a message',
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (request: any, reply: any) => {
      await controller.deleteMessage(request, reply);
    }
  );

  // Mark messages as read
  fastify.post(
    '/conversations/:conversationId/read',
    {
      preHandler: authMiddleware,
      schema: {
        tags: ['Messages'],
        description: 'Mark all unread messages in a conversation as read',
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (request: any, reply: any) => {
      await controller.markAsRead(request, reply);
    }
  );
}
