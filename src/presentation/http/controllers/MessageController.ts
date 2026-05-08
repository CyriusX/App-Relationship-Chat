import { inject, injectable } from 'tsyringe';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { IConversationRepository, IMessageRepository } from '@domain/repositories';
import { ConversationId, MessageId, MessageType } from '@domain/value-objects';
import { Message } from '@domain/entities';
import { MessageMapper } from '@application/mappers';
import {
  IConversationRepository as ConversationRepositoryToken,
  IMessageRepository as MessageRepositoryToken,
} from '@shared/container/tokens';
import type { JwtPayload } from '../middlewares/auth.middleware';

interface AuthenticatedRequest extends FastifyRequest {
  userPayload: JwtPayload;
}

@injectable()
export class MessageController {
  constructor(
    @inject(ConversationRepositoryToken)
    private readonly conversationRepository: IConversationRepository,
    @inject(MessageRepositoryToken)
    private readonly messageRepository: IMessageRepository
  ) {}

  async getMessages(
    request: FastifyRequest<{
      Params: { conversationId: string };
      Querystring: { limit?: number; before?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.userPayload.userId;
    const { conversationId } = request.params;
    // Convert query params to numbers (querystring values are strings)
    const limit = Number(request.query.limit) || 50;
    const before = request.query.before;

    const convId = ConversationId.restore(conversationId);

    const conversation = await this.conversationRepository.findById(convId);
    if (!conversation || !conversation.hasParticipant(userId)) {
      reply.status(404).send({ error: 'Conversation not found' });
      return;
    }

    const messages = await this.messageRepository.findByConversationId(
      convId,
      limit,
      before ? new Date(before) : undefined
    );

    reply.send({
      messages: messages.map((m) => MessageMapper.toResponseDTO(m)),
      hasMore: messages.length === limit,
    });
  }

  async sendMessage(
    request: FastifyRequest<{
      Params: { conversationId: string };
      Body: { content: string; type?: string; replyToId?: string; mediaUrl?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.userPayload.userId;
    const { conversationId } = request.params;
    const { content, type = 'TEXT', replyToId, mediaUrl } = request.body;

    const convId = ConversationId.restore(conversationId);

    const conversation = await this.conversationRepository.findById(convId);
    if (!conversation || !conversation.hasParticipant(userId)) {
      reply.status(404).send({ error: 'Conversation not found' });
      return;
    }

    const messageType = MessageType.fromString(type);
    const message = Message.create(convId, userId, content, messageType);

    if (replyToId) message.setReplyTo(MessageId.restore(replyToId));
    if (mediaUrl && messageType.isMedia) message.setMediaUrl(mediaUrl);

    await this.messageRepository.save(message);
    conversation.addMessage(message);
    await this.conversationRepository.save(conversation);

    reply.status(201).send(MessageMapper.toResponseDTO(message));
  }

  async editMessage(
    request: FastifyRequest<{
      Params: { messageId: string };
      Body: { content: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.userPayload.userId;
    const { messageId } = request.params;
    const { content } = request.body;

    const message = await this.messageRepository.findById(MessageId.restore(messageId));
    if (!message || message.senderId !== userId) {
      reply.status(404).send({ error: 'Message not found' });
      return;
    }

    message.edit(content);
    await this.messageRepository.save(message);

    reply.send(MessageMapper.toResponseDTO(message));
  }

  async deleteMessage(
    request: FastifyRequest<{ Params: { messageId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.userPayload.userId;
    const { messageId } = request.params;

    const message = await this.messageRepository.findById(MessageId.restore(messageId));
    if (!message || message.senderId !== userId) {
      reply.status(404).send({ error: 'Message not found' });
      return;
    }

    message.delete();
    await this.messageRepository.save(message);

    reply.status(204).send();
  }

  async markAsRead(
    request: FastifyRequest<{ Params: { conversationId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.userPayload.userId;
    const { conversationId } = request.params;

    const convId = ConversationId.restore(conversationId);

    const conversation = await this.conversationRepository.findById(convId);
    if (!conversation || !conversation.hasParticipant(userId)) {
      reply.status(404).send({ error: 'Conversation not found' });
      return;
    }

    const count = await this.messageRepository.markAsRead(convId, userId);

    reply.send({ markedAsRead: count });
  }
}
