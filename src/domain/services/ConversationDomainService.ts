import { Conversation, Message } from '../entities';
import { ConversationId } from '../value-objects';
import {
  ConversationNotFoundError,
  UserNotParticipantError,
  ChatNotAuthorizedError,
} from '../errors';

/**
 * Domain Service for Conversation operations
 * Contains business logic that spans multiple conversations or requires external validation
 */
export class ConversationDomainService {
  /**
   * Validate if a user can send a message in a conversation
   */
  canSendMessage(conversation: Conversation, userId: string): boolean {
    // User must be participant
    if (!conversation.hasParticipant(userId)) {
      return false;
    }

    return true;
  }

  /**
   * Get the other participant in a conversation
   */
  getOtherParticipant(conversation: Conversation, userId: string): string {
    return conversation.getOtherParticipant(userId);
  }

  /**
   * Calculate unread count for a user
   */
  calculateUnreadCount(conversation: Conversation, userId: string): number {
    return conversation.getUnreadCount(userId);
  }

  /**
   * Get last active conversation for sorting
   */
  getLastActivity(conversation: Conversation): Date {
    return conversation.lastMessageAt;
  }

  /**
   * Sort conversations by last activity (most recent first)
   */
  sortConversationsByActivity(conversations: Conversation[]): Conversation[] {
    return [...conversations].sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    );
  }

  /**
   * Filter conversations where user is participant
   */
  filterUserConversations(conversations: Conversation[], userId: string): Conversation[] {
    return conversations.filter((c) => c.hasParticipant(userId));
  }

  /**
   * Get conversation display name for a user (returns other participant's name)
   */
  getConversationDisplayName(conversation: Conversation, userId: string): string {
    // In a real app, this would fetch the other user's profile
    // For now, return the other participant's ID
    return this.getOtherParticipant(conversation, userId);
  }

  /**
   * Check if two conversations are the same (same participants)
   */
  areSameParticipants(convA: Conversation, convB: Conversation): boolean {
    const participantsA = new Set(convA.participants);
    const participantsB = new Set(convB.participants);

    if (participantsA.size !== participantsB.size) {
      return false;
    }

    for (const participant of participantsA) {
      if (!participantsB.has(participant)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate conversation can be started between users
   * This would call IMatchValidator in the application layer
   */
  async validateConversationStart(
    hasMatch: boolean,
    isBlocked: boolean
  ): Promise<void> {
    if (isBlocked) {
      throw new ChatNotAuthorizedError('Users are blocked');
    }

    if (!hasMatch) {
      throw new ChatNotAuthorizedError('No match exists between users');
    }
  }
}
