/**
 * Message status enum
 */
export enum MessageStatusEnum {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}

/**
 * Value Object representing message delivery status
 */
export class MessageStatus {
  private readonly _value: MessageStatusEnum;

  private constructor(value: MessageStatusEnum) {
    this._value = value;
  }

  static sent(): MessageStatus {
    return new MessageStatus(MessageStatusEnum.SENT);
  }

  static delivered(): MessageStatus {
    return new MessageStatus(MessageStatusEnum.DELIVERED);
  }

  static read(): MessageStatus {
    return new MessageStatus(MessageStatusEnum.READ);
  }

  static fromString(value: string): MessageStatus {
    const status = Object.values(MessageStatusEnum).find((s) => s === value);
    if (!status) {
      throw new Error(`Invalid message status: ${value}`);
    }
    return new MessageStatus(status);
  }

  get value(): MessageStatusEnum {
    return this._value;
  }

  get isSent(): boolean {
    return this._value === MessageStatusEnum.SENT;
  }

  get isDelivered(): boolean {
    return this._value === MessageStatusEnum.DELIVERED;
  }

  get isRead(): boolean {
    return this._value === MessageStatusEnum.READ;
  }

  canTransitionTo(newStatus: MessageStatus): boolean {
    const order = [MessageStatusEnum.SENT, MessageStatusEnum.DELIVERED, MessageStatusEnum.READ];
    const currentIndex = order.indexOf(this._value);
    const newIndex = order.indexOf(newStatus._value);
    return newIndex >= currentIndex;
  }

  equals(other: MessageStatus): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  toJSON(): string {
    return this._value;
  }
}
