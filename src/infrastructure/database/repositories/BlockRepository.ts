import { assertAccountActive } from '../../privacy/AccountAccess';
import { injectable } from 'tsyringe';
import { logger } from '@shared/logger';

import { IBlockRepository } from '@domain/repositories';
import { prismaClient as prisma } from '@infrastructure/database/client';

@injectable()
export class BlockRepository implements IBlockRepository {
  /**
   * Check if block exists between two users
   */
  async existsBetween(userId1: string, userId2: string): Promise<boolean> {
    try {
      await Promise.all([assertAccountActive(userId1), assertAccountActive(userId2)]);
      // Check both directions (userA blocked userB or userB blocked userA)
      const count = await prisma.block.count({
        where: {
          OR: [
            { blockerId: userId1, blockedId: userId2 },
            { blockerId: userId2, blockedId: userId1 },
          ],
        },
      });

      return count > 0;
    } catch (error) {
      logger.error({ error, userId1, userId2 }, 'Failed to check block existence');
      throw error;
    }
  }
}
