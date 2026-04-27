import { z } from 'zod';

const UuidSchema = z.string().uuid();

/**
 * BlockId Value Object
 * Represents a unique identifier for a Block
 */
export class BlockId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): BlockId {
    const validated = UuidSchema.parse(value);
    return new BlockId(validated);
  }

  get value(): string {
    return this._value;
  }

  equals(other: BlockId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  toJSON(): string {
    return this._value;
  }
}
