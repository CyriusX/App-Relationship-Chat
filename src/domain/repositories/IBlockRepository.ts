/**
 * Block Repository Interface (Port)
 * Defines the contract for block validation
 * This is read-only from CORE service
 */
export interface IBlockRepository {
  /**
   * Check if block exists between two users (either direction)
   */
  existsBetween(userId1: string, userId2: string): Promise<boolean>;
}
