import { Message } from '../entities';
import { MessageId, ConversationId, MessageStatus } from '../value-objects';
import { MessageNotFoundError, CannotEditDeletedMessageError } from '../errors';

/**
 * Domain Service for Message operations
 * Contains business logic that spans multiple messages or requires repository access
 */
export class MessageDomainService {
  /**
   * Validate if a message can be edited
   */
  canEditMessage(message: Message, userId: string): boolean {
    // Cannot edit if deleted
    if (message.isDeleted) {
      return false;
    }

    // Only sender can edit
    if (message.senderId !== userId) {
      return false;
    }

    return true;
  }

  /**
   * Validate if a message can be deleted
   */
  canDeleteMessage(message: Message, userId: string): boolean {
    // Only sender can delete
    if (message.senderId !== userId) {
      return false;
    }

    return true;
  }

  /**
   * Validate if a user can mark message as read
   */
  canMarkAsRead(message: Message, userId: string): boolean {
    // Cannot mark own messages as read
    if (message.senderId === userId) {
      return false;
    }

    // Cannot mark deleted messages as read
    if (message.isDeleted) {
      return false;
    }

    return true;
  }

  /**
   * Get message preview for notifications
   */
  getMessagePreview(message: Message): string {
    if (message.isDeleted) {
      return 'Message deleted';
    }

    return message.content.preview;
  }

  /**
   * Check if messages are in correct order for display
   */
  areMessagesInOrder(messages: Message[]): boolean {
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].createdAt < messages[i - 1].createdAt) {
        return false;
      }
    }
    return true;
  }

  /**
   * Sort messages by creation date (ascending)
   */
  sortMessagesByDate(messages: Message[], ascending: boolean = true): Message[] {
    return [...messages].sort((a, b) => {
      const diff = a.createdAt.getTime() - b.createdAt.getTime();
      return ascending ? diff : -diff;
    });
  }

  /**
   * Filter out deleted messages for a user
   */
  filterVisibleMessages(messages: Message[], userId: string): Message[] {
    return messages.filter((m) => !m.isDeleted);
  }

  /**
   * Group messages by date
   */
  groupMessagesByDate(messages: Message[]): Map<string, Message[]> {
    const groups = new Map<string, Message[]>();

    for (const message of messages) {
      const dateKey = message.createdAt.toISOString().split('T')[0];
      const existing = groups.get(dateKey) || [];
      groups.set(dateKey, [...existing, message]);
    }

    return groups;
  }
}
