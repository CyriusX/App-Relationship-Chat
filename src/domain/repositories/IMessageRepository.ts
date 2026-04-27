import { Message } from '../entities';
import { MessageId, ConversationId, MessageStatus } from '../value-objects';

/**
 * Message Repository Interface (Port)
 * Defines the contract for message persistence
 */
export interface IMessageRepository {
  /**
   * Find message by ID
   */
  findById(id: MessageId): Promise<Message | null>;

  /**
   * Find all messages for a conversation
   */
  findByConversationId(
    conversationId: ConversationId,
    limit?: number,
    before?: Date
  ): Promise<Message[]>;

  /**
   * Count messages in a conversation
   */
  countByConversationId(conversationId: ConversationId): Promise<number>;

  /**
   * Save message (create or update)
   */
  save(message: Message): Promise<Message>;

  /**
   * Delete message (soft delete)
   */
  delete(id: MessageId): Promise<void>;

  /**
   * Update message status
   */
  updateStatus(id: MessageId, status: MessageStatus): Promise<void>;

  /**
   * Find unread messages for a user in a conversation
   */
  findUnreadByConversationId(conversationId: ConversationId, userId: string): Promise<Message[]>;

  /**
   * Count unread messages for a user in a conversation
   */
  countUnreadByConversationId(conversationId: ConversationId, userId: string): Promise<number>;

  /**
   * Mark messages as read for a user in a conversation
   */
  markAsRead(conversationId: ConversationId, userId: string): Promise<number>;
}
