import { injectable } from 'tsyringe';
import { PrismaClient } from '../generated';
import { Conversation } from '@domain/entities';
import { ConversationId } from '@domain/value-objects';
import { IConversationRepository } from '@domain/repositories';
import { prismaClient as prisma } from '@infrastructure/database/client';
import { logger } from '@shared/logger';

@injectable()
export class ConversationRepository implements IConversationRepository {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async findById(id: ConversationId): Promise<Conversation | null> {
    try {
      const record = await this.prisma.conversation.findUnique({
        where: { id: id.value },
        include: {
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!record) {
        return null;
      }

      return this.toDomain(record);
    } catch (error) {
      logger.error({ error, conversationId: id.value }, 'Failed to find conversation by ID');
      throw error;
    }
  }

  async findByParticipants(userAId: string, userBId: string): Promise<Conversation | null> {
    try {
      // Ensure consistent ordering (smaller ID first)
      const [sortedUserAId, sortedUserBId] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];

      const record = await this.prisma.conversation.findFirst({
        where: {
          userAId: sortedUserAId,
          userBId: sortedUserBId,
        },
        include: {
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!record) {
        return null;
      }

      return this.toDomain(record);
    } catch (error) {
      logger.error({ error, userAId, userBId }, 'Failed to find conversation by participants');
      throw error;
    }
  }

  async findByUserId(userId: string, limit = 20, offset = 0): Promise<Conversation[]> {
    try {
      const records = await this.prisma.conversation.findMany({
        where: {
          OR: [{ userAId: userId }, { userBId: userId }],
        },
        orderBy: { lastMessageAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      return records.map(
        (r: {
          id: string;
          userAId: string;
          userBId: string;
          matchId: string | null;
          lastMessageAt: Date;
          createdAt: Date;
          updatedAt: Date;
          messages?: Array<{
            id: string;
            conversationId: string;
            senderId: string;
            content: string | null;
            createdAt: Date;
          }>;
        }) => this.toDomain(r)
      );
    } catch (error) {
      logger.error({ error, userId }, 'Failed to find conversations by user ID');
      throw error;
    }
  }

  async countByUserId(userId: string): Promise<number> {
    try {
      return await this.prisma.conversation.count({
        where: {
          OR: [{ userAId: userId }, { userBId: userId }],
        },
      });
    } catch (error) {
      logger.error({ error, userId }, 'Failed to count conversations');
      throw error;
    }
  }

  async save(conversation: Conversation): Promise<Conversation> {
    try {
      const data = this.toPrisma(conversation);

      const record = await this.prisma.conversation.upsert({
        where: { id: data.id },
        create: data,
        update: {
          lastMessageAt: data.lastMessageAt,
          updatedAt: new Date(),
        },
      });

      return this.toDomain(record);
    } catch (error) {
      logger.error({ error, conversationId: conversation.id.value }, 'Failed to save conversation');
      throw error;
    }
  }

  async delete(id: ConversationId): Promise<void> {
    try {
      // Soft delete by removing all messages (cascade)
      await this.prisma.conversation.delete({
        where: { id: id.value },
      });
    } catch (error) {
      logger.error({ error, conversationId: id.value }, 'Failed to delete conversation');
      throw error;
    }
  }

  async existsBetweenUsers(userAId: string, userBId: string): Promise<boolean> {
    try {
      const [sortedUserAId, sortedUserBId] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];

      const count = await this.prisma.conversation.count({
        where: {
          userAId: sortedUserAId,
          userBId: sortedUserBId,
        },
      });

      return count > 0;
    } catch (error) {
      logger.error({ error, userAId, userBId }, 'Failed to check conversation existence');
      throw error;
    }
  }

  // ============ Mappers ============

  private toDomain(record: {
    id: string;
    userAId: string;
    userBId: string;
    matchId: string | null;
    lastMessageAt: Date;
    createdAt: Date;
    updatedAt: Date;
    messages?: Array<{
      id: string;
      conversationId: string;
      senderId: string;
      content: string | null;
      createdAt: Date;
    }>;
  }): Conversation {
    return Conversation.restore(
      record.id,
      record.userAId,
      record.userBId,
      record.matchId,
      [], // messages loaded separately
      record.createdAt,
      record.updatedAt,
      record.lastMessageAt
    );
  }

  private toPrisma(conversation: Conversation): {
    id: string;
    userAId: string;
    userBId: string;
    matchId: string | null;
    lastMessageAt: Date;
    createdAt: Date;
    updatedAt: Date;
  } {
    const json = conversation.toJSON();
    return {
      id: json.id,
      userAId: json.userAId,
      userBId: json.userBId,
      matchId: json.matchId,
      lastMessageAt: json.lastMessageAt,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
    };
  }
}
