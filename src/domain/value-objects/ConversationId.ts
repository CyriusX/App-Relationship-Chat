import { z } from 'zod';

const UuidSchema = z.string().uuid();

/**
 * Value Object representing a Conversation ID
 */
export class ConversationId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Create a new ConversationId with UUID validation
   * Use this for new IDs
   */
  static create(value: string): ConversationId {
    const validated = UuidSchema.parse(value);
    return new ConversationId(validated);
  }

  /**
   * Restore a ConversationId from persistence without UUID validation
   * Use this for existing IDs from database
   */
  static restore(value: string): ConversationId {
    return new ConversationId(value);
  }

  static generate(): ConversationId {
    const uuid = crypto.randomUUID();
    return new ConversationId(uuid);
  }

  get value(): string {
    return this._value;
  }

  equals(other: ConversationId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  toJSON(): string {
    return this._value;
  }
}
