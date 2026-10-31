import { chatInbox } from '@infrastructure/chat/inbox';
import { AuthorizeConversationUseCase } from '@application/use-cases/conversation/AuthorizeConversationUseCase';
import type { Socket, Server } from 'socket.io';
import { injectable, inject } from 'tsyringe';
import type { IPresenceRepository } from '@domain/repositories';
import { PresenceStatus } from '@domain/value-objects';
import { logger } from '@shared/logger';
import { IPresenceRepository as PresenceRepositoryToken } from '@shared/container/tokens';

@injectable()
export class ChatSocketHandlers {
  constructor(
    @inject(PresenceRepositoryToken)
    private readonly presenceRepository: IPresenceRepository,
    @inject(AuthorizeConversationUseCase) private readonly authorize: AuthorizeConversationUseCase
  ) {}

  register(socket: Socket, io: Server): void {
    const userId = (socket as any).userId as string;

    socket.use(async (packet, next) => {
      const payload: unknown = packet[1];
      try {
        if (['conversation:join', 'typing:start', 'typing:stop'].includes(packet[0])) {
          if (
            typeof payload !== 'object' ||
            payload === null ||
            !('conversationId' in payload) ||
            typeof payload.conversationId !== 'string'
          )
            throw new Error('Conversation unavailable');
          await this.authorize.execute(userId, payload.conversationId);
        } else if (
          packet[0] !== 'conversation:leave' &&
          typeof payload === 'object' &&
          payload !== null &&
          'conversationId' in payload &&
          typeof payload.conversationId === 'string'
        ) {
          await this.authorize.execute(userId, payload.conversationId);
        }
        next();
      } catch {
        socket.emit('error', { message: 'Conversation unavailable', code: 'FORBIDDEN' });
        next(new Error('Conversation unavailable'));
      }
    });
    // Conversation room handlers
    socket.on('conversation:join', (data: any) =>
      this.handleJoinConversation(socket, userId, data)
    );
    socket.on('conversation:leave', (data: any) =>
      this.handleLeaveConversation(socket, userId, data)
    );

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
    _io: Server,
    userId: string,
    data: {
      conversationId: string;
      content: string;
      type?: string;
      clientMessageId?: string;
      replyToId?: string;
      mediaUrl?: string;
    }
  ): Promise<void> {
    try {
      socket.emit('message:sent', await chatInbox.send(userId, data.conversationId, data));
    } catch {
      socket.emit('message:error', {
        conversationId: data.conversationId,
        clientMessageId: data.clientMessageId,
        message: 'Não foi possível enviar a mensagem.',
      });
    }
  }

  private async handleEditMessage(
    socket: Socket,
    _io: Server,
    userId: string,
    data: { messageId: string; content: string }
  ): Promise<void> {
    try {
      await chatInbox.change(userId, data.messageId, { content: data.content });
    } catch {
      socket.emit('error', { code: 'EDIT_ERROR', message: 'Mensagem indisponível.' });
    }
  }
  private async handleDeleteMessage(
    socket: Socket,
    _io: Server,
    userId: string,
    data: { messageId: string }
  ): Promise<void> {
    try {
      await chatInbox.change(userId, data.messageId, null);
    } catch {
      socket.emit('error', { code: 'DELETE_ERROR', message: 'Mensagem indisponível.' });
    }
  }

  private async handleMarkAsRead(
    socket: Socket,
    _io: Server,
    userId: string,
    data: { conversationId: string; lastReadMessageId?: string }
  ): Promise<void> {
    try {
      await chatInbox.read(userId, data.conversationId, data);
    } catch {
      socket.emit('error', {
        code: 'READ_ERROR',
        message: 'Não foi possível registrar a leitura.',
      });
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

  private handleJoinConversation(
    socket: Socket,
    userId: string,
    data: { conversationId: string }
  ): void {
    try {
      const room = `conversation:${data.conversationId}`;
      socket.join(room);
      (socket as any).conversationRooms.add(data.conversationId);
      logger.info({ userId, socketId: socket.id, room }, 'Joined conversation room');
    } catch (error) {
      logger.error({ error, userId }, 'Failed to join conversation room');
    }
  }

  private handleLeaveConversation(
    socket: Socket,
    userId: string,
    data: { conversationId: string }
  ): void {
    try {
      const room = `conversation:${data.conversationId}`;
      socket.leave(room);
      (socket as any).conversationRooms.delete(data.conversationId);
      logger.info({ userId, socketId: socket.id, room }, 'Left conversation room');
    } catch (error) {
      logger.error({ error, userId }, 'Failed to leave conversation room');
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
