import { injectable } from 'tsyringe';
import { Match, MatchCreatedBy } from '@domain/entities';
import { logger } from '@shared/logger';

import { IMatchRepository } from '@domain/repositories';
import { prismaClient as prisma } from '@infrastructure/database/client';

@injectable()
export class MatchRepository implements IMatchRepository {
  /**
   * Find match by ID
   */
  async findById(id: string): Promise<Match | null> {
    try {
      const record = await prisma.match.findUnique({
        where: { id },
      });

      if (!record) {
        return null;
      }

      return this.toDomain(record);
    } catch (error) {
        logger.error({ error, matchId: id }, 'Failed to find match by ID');
        throw error;
    }
  }

  /**
   * Find match between two users
   * Note: Users are normalized (userAId < userBId always in DB)
   */
  async findByUsers(userAId: string, userBId: string): Promise<Match | null> {
    try {
      // Normalize: userAId < userBId always
      const [normalizedA, normalizedB] = userAId < userBId
        ? [userAId, userBId]
        : [userBId, userAId];

      const record = await prisma.match.findFirst({
        where: {
          userAId: normalizedA,
          userBId: normalizedB,
        },
      });

      if (!record) {
        return null;
      }

      return this.toDomain(record);
    } catch (error) {
      logger.error({ error, userAId, userBId }, 'Failed to find match between users');
      throw error;
    }
  }

  /**
   * Check if match exists between two users
   */
  async existsBetween(userAId: string, userBId: string): Promise<boolean> {
    try {
      // Normalize order
      const [normalizedA, normalizedB] = userAId < userBId
        ? [userAId, userBId]
        : [userBId, userAId];

      const count = await prisma.match.count({
        where: {
          userAId: normalizedA,
          userBId: normalizedB,
        },
      });

      return count > 0;
    } catch (error) {
      logger.error({ error, userAId, userBId }, 'Failed to check match existence');
      throw error;
    }
  }

  /**
   * Find matches for a user with pagination
   */
  async findByUserId(userId: string, limit = 20, offset = 0): Promise<Match[]> {
    try {
      const records = await prisma.match.findMany({
        where: {
          OR: [{ userAId: userId }, { userBId: userId }],
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return records.map((r) => this.toDomain(r));
    } catch (error) {
      logger.error({ error, userId }, 'Failed to find matches by user ID');
      throw error;
    }
  }

  // ============ Mappers ============

  private toDomain(record: {
    id: string;
    userAId: string;
    userBId: string;
    createdBy: string;
    createdAt: Date;
  }): Match {
    return Match.restore(
      record.id,
      record.userAId,
      record.userBId,
      record.createdBy as MatchCreatedBy,
      record.createdAt
    );
  }
}
