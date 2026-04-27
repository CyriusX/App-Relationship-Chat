import { MatchId } from '../value-objects';

/**
 * MatchCreatedBy Enum
 * Represents how a match was created
 */
export enum MatchCreatedBy {
  MUTUAL_LIKE = 'mutual_like',
  SUPERLIKE = 'superlike',
}

/**
 * Match Entity
 * Represents a match between two users
 * This is a read-only entity from CORE service
 */
export class Match {
  private readonly _id: MatchId;
  private readonly _userAId: string;
  private readonly _userBId: string;
  private readonly _createdBy: MatchCreatedBy;
  private readonly _createdAt: Date;

  private constructor(
    id: MatchId,
    userAId: string,
    userBId: string,
    createdBy: MatchCreatedBy,
    createdAt: Date
  ) {
    // Ensure normalized ordering (userAId < userBId)
    const [normalizedA, normalizedB] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];

    this._id = id;
    this._userAId = normalizedA;
    this._userBId = normalizedB;
    this._createdBy = createdBy;
    this._createdAt = createdAt;
  }

  /**
   * Factory method to create a new match
   */
  static create(userAId: string, userBId: string, createdBy: MatchCreatedBy): Match {
    const id = MatchId.create(crypto.randomUUID());
    const now = new Date();

    return new Match(id, userAId, userBId, createdBy, now);
  }

  /**
   * Factory method to restore from persistence
   */
  static restore(
    id: string,
    userAId: string,
    userBId: string,
    createdBy: MatchCreatedBy,
    createdAt: Date
  ): Match {
    return new Match(MatchId.create(id), userAId, userBId, createdBy, createdAt);
  }

  // Getters
  get id(): MatchId {
    return this._id;
  }

  get userAId(): string {
    return this._userAId;
  }

  get userBId(): string {
    return this._userBId;
  }

  get createdBy(): MatchCreatedBy {
    return this._createdBy;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * Check if a user is involved in this match
   */
  involves(userId: string): boolean {
    return this._userAId === userId || this._userBId === userId;
  }

  /**
   * Get the other user's ID in this match
   */
  getOtherUserId(userId: string): string {
    if (this._userAId === userId) return this._userBId;
    if (this._userBId === userId) return this._userAId;
    throw new Error(`User ${userId} is not part of this match`);
  }

  /**
   * Check if this match is between two specific users
   */
  isBetween(userAId: string, userBId: string): boolean {
    const [normalizedA, normalizedB] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];

    return this._userAId === normalizedA && this._userBId === normalizedB;
  }

  // Equality
  equals(other: Match): boolean {
    return this._id.equals(other._id);
  }

  // Serialization
  toJSON(): {
    id: string;
    userAId: string;
    userBId: string;
    createdBy: MatchCreatedBy;
    createdAt: Date;
  } {
    return {
      id: this._id.value,
      userAId: this._userAId,
      userBId: this._userBId,
      createdBy: this._createdBy,
      createdAt: this._createdAt,
    };
  }
}

// Import crypto for ID generation
