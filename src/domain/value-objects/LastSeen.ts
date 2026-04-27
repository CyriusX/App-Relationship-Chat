/**
 * Value Object representing user's last seen timestamp
 */
export class LastSeen {
  private readonly _value: Date;

  private constructor(value: Date) {
    this._value = value;
  }

  static now(): LastSeen {
    return new LastSeen(new Date());
  }

  static fromDate(date: Date): LastSeen {
    return new LastSeen(date);
  }

  static fromISOString(isoString: string): LastSeen {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid ISO date string: ${isoString}`);
    }
    return new LastSeen(date);
  }

  get value(): Date {
    return this._value;
  }

  get isRecent(): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this._value > fiveMinutesAgo;
  }

  get secondsAgo(): number {
    return Math.floor((Date.now() - this._value.getTime()) / 1000);
  }

  get minutesAgo(): number {
    return Math.floor(this.secondsAgo / 60);
  }

  get hoursAgo(): number {
    return Math.floor(this.minutesAgo / 60);
  }

  get daysAgo(): number {
    return Math.floor(this.hoursAgo / 24);
  }

  equals(other: LastSeen): boolean {
    return this._value.getTime() === other._value.getTime();
  }

  toString(): string {
    return this._value.toISOString();
  }

  toJSON(): string {
    return this._value.toISOString();
  }
}
