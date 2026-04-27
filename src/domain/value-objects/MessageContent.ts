import { z } from 'zod';

const MessageContentSchema = z.string().min(1).max(5000);

/**
 * Value Object representing validated message content
 */
export class MessageContent {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): MessageContent {
    const validated = MessageContentSchema.parse(value.trim());
    return new MessageContent(validated);
  }

  get value(): string {
    return this._value;
  }

  get length(): number {
    return this._value.length;
  }

  get preview(): string {
    return this._value.slice(0, 200);
  }

  equals(other: MessageContent): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  toJSON(): string {
    return this._value;
  }
}
