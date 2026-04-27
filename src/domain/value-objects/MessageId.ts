import { z } from 'zod';

const UuidSchema = z.string().uuid();

/**
 * Value Object representing a Message ID
 */
export class MessageId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Create a new MessageId with UUID validation
   * Use this for new IDs
   */
  static create(value: string): MessageId {
    const validated = UuidSchema.parse(value);
    return new MessageId(validated);
  }

  /**
   * Restore a MessageId from persistence without UUID validation
   * Use this for existing IDs from database
   */
  static restore(value: string): MessageId {
    return new MessageId(value);
  }

  static generate(): MessageId {
    const uuid = crypto.randomUUID();
    return new MessageId(uuid);
  }

  get value(): string {
    return this._value;
  }

  equals(other: MessageId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  toJSON(): string {
    return this._value;
  }
}
