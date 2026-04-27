import { Conversation } from '../entities';
import { ConversationId } from '../value-objects';

/**
 * Conversation Repository Interface (Port)
 * Defines the contract for conversation persistence
 */
export interface IConversationRepository {
  /**
   * Find conversation by ID
   */
  findById(id: ConversationId): Promise<Conversation | null>;

  /**
   * Find conversation between two users
   */
  findByParticipants(userAId: string, userBId: string): Promise<Conversation | null>;

  /**
   * Find all conversations for a user
   */
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Conversation[]>;

  /**
   * Count total conversations for a user
   */
  countByUserId(userId: string): Promise<number>;

  /**
   * Save conversation (create or update)
   */
  save(conversation: Conversation): Promise<Conversation>;

  /**
   * Delete conversation (soft delete - mark as inactive)
   */
  delete(id: ConversationId): Promise<void>;

  /**
   * Check if conversation exists between users
   */
  existsBetweenUsers(userAId: string, userBId: string): Promise<boolean>;
}
