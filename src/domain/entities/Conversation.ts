import { ConversationId, MessageId } from '../value-objects';
import { Message } from './Message';

/**
 * Conversation Entity (Aggregate Root)
 * Represents a 1:1 conversation between two users
 */
export class Conversation {
  private readonly _id: ConversationId;
  private readonly _userAId: string;
  private readonly _userBId: string;
  private readonly _matchId: string | null;
  private readonly _messages: Message[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _lastMessageAt: Date;

  private constructor(
    id: ConversationId,
    userAId: string,
    userBId: string,
    matchId: string | null,
    messages: Message[],
    createdAt: Date,
    updatedAt: Date,
    lastMessageAt: Date
  ) {
    this._id = id;
    this._userAId = userAId;
    this._userBId = userBId;
    this._matchId = matchId;
    this._messages = messages;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._lastMessageAt = lastMessageAt;
  }

  /**
   * Factory method to create a new conversation
   */
  static create(userAId: string, userBId: string, matchId?: string): Conversation {
    const id = ConversationId.generate();
    const now = new Date();

    // Ensure consistent ordering (smaller ID first)
    const [sortedUserA, sortedUserB] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];

    return new Conversation(id, sortedUserA, sortedUserB, matchId ?? null, [], now, now, now);
  }

  /**
   * Factory method to restore from persistence
   */
  static restore(
    id: string,
    userAId: string,
    userBId: string,
    matchId: string | null,
    messages: Message[],
    createdAt: Date,
    updatedAt: Date,
    lastMessageAt: Date
  ): Conversation {
    return new Conversation(
      ConversationId.restore(id),
      userAId,
      userBId,
      matchId,
      messages,
      createdAt,
      updatedAt,
      lastMessageAt
    );
  }

  // Getters
  get id(): ConversationId {
    return this._id;
  }

  get userAId(): string {
    return this._userAId;
  }

  get userBId(): string {
    return this._userBId;
  }

  get matchId(): string | null {
    return this._matchId;
  }

  get messages(): readonly Message[] {
    return this._messages;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get lastMessageAt(): Date {
    return this._lastMessageAt;
  }

  /**
   * Check if user is participant in this conversation
   */
  hasParticipant(userId: string): boolean {
    return this._userAId === userId || this._userBId === userId;
  }

  /**
   * Get the other participant's ID
   */
  getOtherParticipant(userId: string): string {
    if (!this.hasParticipant(userId)) {
      throw new Error(`User ${userId} is not a participant in this conversation`);
    }
    return this._userAId === userId ? this._userBId : this._userAId;
  }

  /**
   * Get participants as array
   */
  get participants(): [string, string] {
    return [this._userAId, this._userBId];
  }

  /**
   * Get last message (non-deleted)
   */
  get lastMessage(): Message | null {
    for (let i = this._messages.length - 1; i >= 0; i--) {
      if (!this._messages[i].isDeleted) {
        return this._messages[i];
      }
    }
    return null;
  }

  /**
   * Get message count (excluding deleted)
   */
  get messageCount(): number {
    return this._messages.filter((m) => !m.isDeleted).length;
  }

  // Domain behaviors

  /**
   * Add a message to the conversation
   */
  addMessage(message: Message): void {
    this._messages.push(message);
    this._lastMessageAt = message.createdAt;
    this._updatedAt = new Date();
  }

  /**
   * Find message by ID
   */
  findMessage(messageId: MessageId): Message | null {
    return this._messages.find((m) => m.id.equals(messageId)) ?? null;
  }

  /**
   * Get messages for pagination
   */
  getMessages(limit: number = 50, before?: Date): Message[] {
    let filtered = this._messages.filter((m) => !m.isDeleted);

    if (before) {
      filtered = filtered.filter((m) => m.createdAt < before);
    }

    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }

  /**
   * Get unread message count for a user
   */
  getUnreadCount(userId: string): number {
    const otherParticipant = this.getOtherParticipant(userId);

    return this._messages.filter(
      (m) => m.senderId === otherParticipant && m.status.isSent
    ).length;
  }

  /**
   * Mark all messages as read for a user
   */
  markAllAsRead(userId: string): void {
    const otherParticipant = this.getOtherParticipant(userId);

    this._messages.forEach((m) => {
      if (m.senderId === otherParticipant && !m.status.isRead) {
        m.markAsRead();
      }
    });

    this._updatedAt = new Date();
  }

  // Equality
  equals(other: Conversation): boolean {
    return this._id.equals(other._id);
  }

  // Serialization
  toJSON(): {
    id: string;
    userAId: string;
    userBId: string;
    matchId: string | null;
    messageCount: number;
    createdAt: Date;
    updatedAt: Date;
    lastMessageAt: Date;
  } {
    return {
      id: this._id.value,
      userAId: this._userAId,
      userBId: this._userBId,
      matchId: this._matchId,
      messageCount: this.messageCount,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      lastMessageAt: this._lastMessageAt,
    };
  }
}
