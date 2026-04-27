import type { Socket, Server } from 'socket.io';
import { injectable, inject } from 'tsyringe';
import type {
  IConversationRepository,
  IMessageRepository,
  IPresenceRepository,
} from '@domain/repositories';
import { ConversationId, MessageId, MessageType, PresenceStatus } from '@domain/value-objects';
import { Message } from '@domain/entities';
import { MessageMapper } from '@application/mappers';
import { logger } from '@shared/logger';
import {
  IConversationRepository as ConversationRepositoryToken,
  IMessageRepository as MessageRepositoryToken,
  IPresenceRepository as PresenceRepositoryToken,
} from '@shared/container/tokens';

@injectable()
export class ChatSocketHandlers {
  constructor(
    @inject(ConversationRepositoryToken)
    private readonly conversationRepository: IConversationRepository,
    @inject(MessageRepositoryToken)
    private readonly messageRepository: IMessageRepository,
    @inject(PresenceRepositoryToken)
    private readonly presenceRepository: IPresenceRepository
  ) {}

  register(socket: Socket, io: Server): void {
    const userId = (socket as any).userId as string;

    // Message handlers
    socket.on('message:send', (data: any) => this.handleSendMessage(socket, io, userId, data));
    socket.on('message:edit', (data: any) => this.handleEditMessage(socket, io, userId, data));
    socket.on('message:delete', (data: any) => this.handleDeleteMessage(socket, io, userId, data));
    socket.on('message:read', (data: any) => this.handleMarkAsRead(socket, io, userId, data));

    // Typing handlers
    socket.on('typing:start', (data: any) => this.handleTypingStart(socket, userId, data));
    socket.on('typing:stop', (data: any) => this.handleTypingStop(socket, userId, data));

    // Presence handlers
    socket.on('presence:update', (data: any) =>
      this.handlePresenceUpdate(socket, io, userId, data)
    );

    logger.info({ userId, socketId: socket.id }, 'Socket handlers registered');
  }

  private async handleSendMessage(
    socket: Socket,
    io: Server,
    userId: string,
    data: {
      conversationId: string;
      content: string;
      type?: string;
      replyToId?: string;
      mediaUrl?: string;
    }
  ): Promise<void> {
    try {
      const convId = ConversationId.restore(data.conversationId);

      const conversation = await this.conversationRepository.findById(convId);
      if (!conversation || !conversation.hasParticipant(userId)) {
        socket.emit('error', { message: 'Conversation not found', code: 'NOT_FOUND' });
        return;
      }

      const messageType = data.type ? MessageType.fromString(data.type) : MessageType.text();
      const message = Message.create(convId, userId, data.content, messageType);

      if (data.replyToId) {
        message.setReplyTo(MessageId.restore(data.replyToId));
      }

      if (data.mediaUrl && messageType.isMedia) {
        message.setMediaUrl(data.mediaUrl);
      }

      await this.messageRepository.save(message);

      conversation.addMessage(message);
      await this.conversationRepository.save(conversation);

      const messagePayload = MessageMapper.toResponseDTO(message);
      io.to(`conversation:${data.conversationId}`).emit('message:new', messagePayload);

      const otherParticipant = conversation.getOtherParticipant(userId);
      io.to(`user:${otherParticipant}`).emit('message:new', messagePayload);
    } catch (error) {
      logger.error({ error, userId }, 'Failed to send message');
      socket.emit('error', { message: 'Failed to send message', code: 'SEND_ERROR' });
    }
  }

  private async handleEditMessage(
    socket: Socket,
    io: Server,
    userId: string,
    data: { messageId: string; conversationId: string; content: string }
  ): Promise<void> {
    try {
      const msgId = MessageId.restore(data.messageId);

      const message = await this.messageRepository.findById(msgId);
      if (!message) {
        socket.emit('error', { message: 'Message not found', code: 'NOT_FOUND' });
        return;
      }

      if (message.senderId !== userId) {
        socket.emit('error', { message: 'Forbidden', code: 'FORBIDDEN' });
        return;
      }

      message.edit(data.content);
      await this.messageRepository.save(message);

      const messagePayload = MessageMapper.toResponseDTO(message);
      io.to(`conversation:${data.conversationId}`).emit('message:edited', messagePayload);
    } catch (error) {
      logger.error({ error, userId }, 'Failed to edit message');
      socket.emit('error', { message: 'Failed to edit message', code: 'EDIT_ERROR' });
    }
  }

  private async handleDeleteMessage(
    socket: Socket,
    io: Server,
    userId: string,
    data: { messageId: string; conversationId: string }
  ): Promise<void> {
    try {
      const msgId = MessageId.restore(data.messageId);

      const message = await this.messageRepository.findById(msgId);
      if (!message) {
        socket.emit('error', { message: 'Message not found', code: 'NOT_FOUND' });
        return;
      }

      if (message.senderId !== userId) {
        socket.emit('error', { message: 'Forbidden', code: 'FORBIDDEN' });
        return;
      }

      message.delete();
      await this.messageRepository.save(message);

      io.to(`conversation:${data.conversationId}`).emit('message:deleted', {
        messageId: data.messageId,
        conversationId: data.conversationId,
      });
    } catch (error) {
      logger.error({ error, userId }, 'Failed to delete message');
      socket.emit('error', { message: 'Failed to delete message', code: 'DELETE_ERROR' });
    }
  }

  private async handleMarkAsRead(
    socket: Socket,
    io: Server,
    userId: string,
    data: { conversationId: string }
  ): Promise<void> {
    try {
      const convId = ConversationId.restore(data.conversationId);

      const conversation = await this.conversationRepository.findById(convId);
      if (!conversation || !conversation.hasParticipant(userId)) {
        socket.emit('error', { message: 'Conversation not found', code: 'NOT_FOUND' });
        return;
      }

      const count = await this.messageRepository.markAsRead(convId, userId);

      if (count > 0) {
        const otherParticipant = conversation.getOtherParticipant(userId);
        io.to(`user:${otherParticipant}`).emit('messages:read', {
          conversationId: data.conversationId,
          userId,
          count,
        });
      }
    } catch (error) {
      logger.error({ error, userId }, 'Failed to mark as read');
      socket.emit('error', { message: 'Failed to mark as read', code: 'READ_ERROR' });
    }
  }

  private async handleTypingStart(
    socket: Socket,
    userId: string,
    data: { conversationId: string }
  ): Promise<void> {
    try {
      await this.presenceRepository.setTyping(data.conversationId, userId);

      socket.to(`conversation:${data.conversationId}`).emit('typing:started', {
        conversationId: data.conversationId,
        userId,
      });
    } catch (error) {
      logger.error({ error, userId }, 'Failed to handle typing start');
    }
  }

  private async handleTypingStop(
    socket: Socket,
    userId: string,
    data: { conversationId: string }
  ): Promise<void> {
    try {
      await this.presenceRepository.removeTyping(data.conversationId, userId);

      socket.to(`conversation:${data.conversationId}`).emit('typing:stopped', {
        conversationId: data.conversationId,
        userId,
      });
    } catch (error) {
      logger.error({ error, userId }, 'Failed to handle typing stop');
    }
  }

  private async handlePresenceUpdate(
    socket: Socket,
    io: Server,
    userId: string,
    data: { status: 'ONLINE' | 'OFFLINE' | 'AWAY' }
  ): Promise<void> {
    try {
      const status =
        data.status === 'ONLINE'
          ? PresenceStatus.online()
          : data.status === 'AWAY'
            ? PresenceStatus.away()
            : PresenceStatus.offline();

      await this.presenceRepository.updateStatus(userId, status);

      io.emit('presence:changed', {
        userId,
        status: data.status,
        lastSeen: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ error, userId }, 'Failed to update presence');
    }
  }
}
