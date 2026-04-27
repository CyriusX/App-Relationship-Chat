import { injectable } from 'tsyringe';
import { PrismaClient } from '../generated';
import { Message } from '@domain/entities';
import { MessageId, ConversationId, MessageStatus } from '@domain/value-objects';
import { IMessageRepository } from '@domain/repositories';
import { prismaClient as prisma } from '@infrastructure/database/client';
import { logger } from '@shared/logger';

// Prisma enum types (string-based until Prisma client is generated)
type PrismaMessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'SYSTEM';
type PrismaMessageStatus = 'SENT' | 'DELIVERED' | 'READ';

@injectable()
export class MessageRepository implements IMessageRepository {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async findById(id: MessageId): Promise<Message | null> {
    try {
      const record = await this.prisma.message.findUnique({
        where: { id: id.value },
      });

      if (!record) {
        return null;
      }

      return this.toDomain(record);
    } catch (error) {
      logger.error({ error, messageId: id.value }, 'Failed to find message by ID');
      throw error;
    }
  }

  async findByConversationId(
    conversationId: ConversationId,
    limit = 50,
    before?: Date
  ): Promise<Message[]> {
    try {
      const records = await this.prisma.message.findMany({
        where: {
          conversationId: conversationId.value,
          deletedAt: null,
          ...(before && { createdAt: { lt: before } }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return records
        .map(
          (r: {
            id: string;
            conversationId: string;
            senderId: string;
            content: string | null;
            type: string;
            mediaUrl: string | null;
            mediaType: string | null;
            status: string;
            replyToId: string | null;
            editedAt: Date | null;
            deletedAt: Date | null;
            createdAt: Date;
          }) => this.toDomain(r)
        )
        .reverse();
    } catch (error) {
      logger.error(
        { error, conversationId: conversationId.value },
        'Failed to find messages by conversation ID'
      );
      throw error;
    }
  }

  async countByConversationId(conversationId: ConversationId): Promise<number> {
    try {
      return await this.prisma.message.count({
        where: {
          conversationId: conversationId.value,
          deletedAt: null,
        },
      });
    } catch (error) {
      logger.error({ error, conversationId: conversationId.value }, 'Failed to count messages');
      throw error;
    }
  }

  async save(message: Message): Promise<Message> {
    try {
      const data = this.toPrisma(message);

      const record = await this.prisma.message.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });

      return this.toDomain(record);
    } catch (error) {
      logger.error({ error, messageId: message.id.value }, 'Failed to save message');
      throw error;
    }
  }

  async delete(id: MessageId): Promise<void> {
    try {
      await this.prisma.message.update({
        where: { id: id.value },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      logger.error({ error, messageId: id.value }, 'Failed to delete message');
      throw error;
    }
  }

  async updateStatus(id: MessageId, status: MessageStatus): Promise<void> {
    try {
      await this.prisma.message.update({
        where: { id: id.value },
        data: { status: this.statusToPrisma(status) },
      });
    } catch (error) {
      logger.error({ error, messageId: id.value }, 'Failed to update message status');
      throw error;
    }
  }

  async findUnreadByConversationId(
    conversationId: ConversationId,
    userId: string
  ): Promise<Message[]> {
    try {
      const records = await this.prisma.message.findMany({
        where: {
          conversationId: conversationId.value,
          senderId: { not: userId },
          deletedAt: null,
          NOT: {
            readReceipts: {
              some: { userId },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return records.map(
        (r: {
          id: string;
          conversationId: string;
          senderId: string;
          content: string | null;
          type: string;
          mediaUrl: string | null;
          mediaType: string | null;
          status: string;
          replyToId: string | null;
          editedAt: Date | null;
          deletedAt: Date | null;
          createdAt: Date;
        }) => this.toDomain(r)
      );
    } catch (error) {
      logger.error(
        { error, conversationId: conversationId.value, userId },
        'Failed to find unread messages'
      );
      throw error;
    }
  }

  async countUnreadByConversationId(
    conversationId: ConversationId,
    userId: string
  ): Promise<number> {
    try {
      return await this.prisma.message.count({
        where: {
          conversationId: conversationId.value,
          senderId: { not: userId },
          deletedAt: null,
          NOT: {
            readReceipts: {
              some: { userId },
            },
          },
        },
      });
    } catch (error) {
      logger.error(
        { error, conversationId: conversationId.value, userId },
        'Failed to count unread messages'
      );
      throw error;
    }
  }

  async markAsRead(conversationId: ConversationId, userId: string): Promise<number> {
    try {
      const unreadMessages = await this.prisma.message.findMany({
        where: {
          conversationId: conversationId.value,
          senderId: { not: userId },
          deletedAt: null,
          NOT: {
            readReceipts: {
              some: { userId },
            },
          },
        },
        select: { id: true },
      });

      if (unreadMessages.length === 0) {
        return 0;
      }

      const now = new Date();
      await this.prisma.messageReadReceipt.createMany({
        data: unreadMessages.map((msg: { id: string }) => ({
          messageId: msg.id,
          userId,
          readAt: now,
        })),
        skipDuplicates: true,
      });

      return unreadMessages.length;
    } catch (error) {
      logger.error(
        { error, conversationId: conversationId.value, userId },
        'Failed to mark messages as read'
      );
      throw error;
    }
  }

  // ============ Mappers ============

  private toDomain(record: {
    id: string;
    conversationId: string;
    senderId: string;
    content: string | null;
    type: string;
    mediaUrl: string | null;
    mediaType: string | null;
    status: string;
    replyToId: string | null;
    editedAt: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
  }): Message {
    const content = record.content ?? '';
    return Message.restore(
      record.id,
      record.conversationId,
      record.senderId,
      content,
      record.type,
      record.status,
      record.createdAt,
      record.editedAt,
      record.deletedAt,
      record.replyToId,
      record.mediaUrl
    );
  }

  private toPrisma(message: Message): {
    id: string;
    conversationId: string;
    senderId: string;
    content: string | null;
    type: PrismaMessageType;
    mediaUrl: string | null;
    mediaType: string | null;
    status: PrismaMessageStatus;
    replyToId: string | null;
    editedAt: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
  } {
    const json = message.toJSON();
    return {
      id: json.id,
      conversationId: json.conversationId,
      senderId: json.senderId,
      content: json.content,
      type: json.type as PrismaMessageType,
      mediaUrl: json.mediaUrl,
      mediaType: null,
      status: json.status as PrismaMessageStatus,
      replyToId: json.replyToId,
      editedAt: message.editedAt,
      deletedAt: message.deletedAt,
      createdAt: json.createdAt,
    };
  }

  private statusToPrisma(status: MessageStatus): PrismaMessageStatus {
    const value = status.value;
    switch (value) {
      case 'SENT':
        return 'SENT';
      case 'DELIVERED':
        return 'DELIVERED';
      case 'READ':
        return 'READ';
      default:
        return 'SENT';
    }
  }
}
