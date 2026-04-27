/**
 * User presence status enum
 */
export enum PresenceStatusEnum {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  AWAY = 'AWAY',
}

/**
 * Value Object representing user presence status
 */
export class PresenceStatus {
  private readonly _value: PresenceStatusEnum;

  private constructor(value: PresenceStatusEnum) {
    this._value = value;
  }

  static online(): PresenceStatus {
    return new PresenceStatus(PresenceStatusEnum.ONLINE);
  }

  static offline(): PresenceStatus {
    return new PresenceStatus(PresenceStatusEnum.OFFLINE);
  }

  static away(): PresenceStatus {
    return new PresenceStatus(PresenceStatusEnum.AWAY);
  }

  static fromString(value: string): PresenceStatus {
    const status = Object.values(PresenceStatusEnum).find((s) => s === value);
    if (!status) {
      throw new Error(`Invalid presence status: ${value}`);
    }
    return new PresenceStatus(status);
  }

  get value(): PresenceStatusEnum {
    return this._value;
  }

  get isOnline(): boolean {
    return this._value === PresenceStatusEnum.ONLINE;
  }

  get isOffline(): boolean {
    return this._value === PresenceStatusEnum.OFFLINE;
  }

  get isAway(): boolean {
    return this._value === PresenceStatusEnum.AWAY;
  }

  equals(other: PresenceStatus): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  toJSON(): string {
    return this._value;
  }
}
