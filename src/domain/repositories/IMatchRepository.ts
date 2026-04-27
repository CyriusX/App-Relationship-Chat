import { Match } from '../entities';

/**
 * Match Repository Interface (Port)
 * Defines the contract for match validation
 * This is read-only from CORE service
 */
export interface IMatchRepository {
  /**
   * Find match by ID
   */
  findById(id: string): Promise<Match | null>;

  /**
   * Find match between two users
   */
  findByUsers(userAId: string, userBId: string): Promise<Match | null>;

  /**
   * Check if match exists between two users
   */
  existsBetween(userAId: string, userBId: string): Promise<boolean>;

  /**
   * Find all matches for a user
   */
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Match[]>;
}
