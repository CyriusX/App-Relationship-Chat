import { z } from 'zod';

const UuidSchema = z.string().uuid();

/**
 * MatchId Value Object
 * Represents a unique identifier for a Match
 */
export class MatchId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): MatchId {
    const validated = UuidSchema.parse(value);
    return new MatchId(validated);
  }

  get value(): string {
    return this._value;
  }

  equals(other: MatchId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  toJSON(): string {
    return this._value;
  }
}
