import { BlockId } from '../value-objects';

/**
 * Block Entity
 * Represents a block between two users
 * This is a read-only entity from CORE service
 */
export class Block {
  private readonly _id: BlockId;
  private readonly _blockerId: string;
  private readonly _blockedId: string;
  private readonly _reason: string | null;
  private readonly _createdAt: Date;

  private constructor(
    id: BlockId,
    blockerId: string,
    blockedId: string,
    reason: string | null,
    createdAt: Date
  ) {
    this._id = id;
    this._blockerId = blockerId;
    this._blockedId = blockedId;
    this._reason = reason;
    this._createdAt = createdAt;
  }

  // Factory method to restore from persistence
  static restore(
    id: string,
    blockerId: string,
    blockedId: string,
    reason: string | null,
    createdAt: Date
  ): Block {
    return new Block(BlockId.create(id), blockerId, blockedId, reason, createdAt);
  }

  // Getters
  get id(): BlockId {
    return this._id;
  }

  get blockerId(): string {
    return this._blockerId;
  }

  get blockedId(): string {
    return this._blockedId;
  }

  get reason(): string | null {
    return this._reason;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  // Business methods

  /**
   * Check if this block involves a specific user
   */
  involves(userId: string): boolean {
    return this._blockerId === userId || this._blockedId === userId;
  }

  /**
   * Check if there's a block between two users (either direction)
   */
  existsBetweenUsers(userId1: string, userId2: string): boolean {
    return (
      (this._blockerId === userId1 && this._blockedId === userId2) ||
      (this._blockerId === userId2 && this._blockedId === userId1)
    );
  }

  // Equality
  equals(other: Block): boolean {
    return this._id.equals(other._id);
  }

  // Serialization
  toJSON(): {
    id: string;
    blockerId: string;
    blockedId: string;
    reason: string | null;
    createdAt: Date;
  } {
    return {
      id: this._id.value,
      blockerId: this._blockerId,
      blockedId: this._blockedId,
      reason: this._reason,
      createdAt: this._createdAt,
    };
  }
}
