import { inject, injectable } from 'tsyringe';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { IConversationRepository } from '@domain/repositories';
import { ConversationId } from '@domain/value-objects';
import { ConversationMapper } from '@application/mappers';
import { CreateConversationUseCase } from '@application/use-cases/conversation';
import {
  IConversationRepository as ConversationRepositoryToken,
  CreateConversationUseCase as CreateConversationUseCaseToken,
} from '@shared/container/tokens';
import type { JwtPayload } from '../middlewares/auth.middleware';

interface AuthenticatedRequest extends FastifyRequest {
  userPayload: JwtPayload;
}

interface CreateConversationBody {
  userAId: string;
  userBId: string;
  matchId?: string;
}

@injectable()
export class ConversationController {
  constructor(
    @inject(ConversationRepositoryToken)
    private readonly conversationRepository: IConversationRepository,
    @inject(CreateConversationUseCaseToken)
    private readonly createConversationUseCase: CreateConversationUseCase
  ) {}

  async list(
    request: FastifyRequest<{ Querystring: { limit?: number; offset?: number } }>,
    reply: FastifyReply
  ): Promise<void> {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.userPayload.userId;
    // Convert query params to numbers (querystring values are strings)
    const limit = Number(request.query.limit) || 20;
    const offset = Number(request.query.offset) || 0;

    const conversations = await this.conversationRepository.findByUserId(userId, limit, offset);
    const total = await this.conversationRepository.countByUserId(userId);
    const hasMore = conversations.length === limit;

    reply.send({
      conversations: await Promise.all(
        conversations.map((c) => ConversationMapper.toResponseDTOAsync(c, userId))
      ),
      total,
      hasMore,
      nextCursor: hasMore ? String(offset + limit) : null,
    });
  }

  async get(
    request: FastifyRequest<{ Params: { conversationId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.userPayload.userId;
    const { conversationId } = request.params;

    const conversation = await this.conversationRepository.findById(
      ConversationId.restore(conversationId)
    );

    if (!conversation) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Conversation not found',
      });
    }

    if (!conversation.hasParticipant(userId)) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You are not a participant in this conversation',
      });
    }

    reply.send(await ConversationMapper.toResponseDTOAsync(conversation, userId));
  }

  async create(
    request: FastifyRequest<{ Body: CreateConversationBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.userPayload.userId;
    const { userAId, userBId, matchId } = request.body;

    // Ensure the authenticated user is one of the participants
    if (userAId !== userId && userBId !== userId) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You can only create conversations where you are a participant',
      });
    }

    try {
      const conversation = await this.createConversationUseCase.execute({
        userAId,
        userBId,
        matchId,
      });

      reply.status(201).send({
        success: true,
        data: conversation,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'UsersNotMatchedError') {
          return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: error.message,
          });
        }
        if (error.name === 'UsersBlockedError') {
          return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: error.message,
          });
        }
      }
      throw error;
    }
  }
}
