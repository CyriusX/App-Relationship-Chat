/**
 * Message type enum
 */
export enum MessageTypeEnum {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  SYSTEM = 'SYSTEM',
}

/**
 * Value Object representing message type
 */
export class MessageType {
  private readonly _value: MessageTypeEnum;

  private constructor(value: MessageTypeEnum) {
    this._value = value;
  }

  static text(): MessageType {
    return new MessageType(MessageTypeEnum.TEXT);
  }

  static image(): MessageType {
    return new MessageType(MessageTypeEnum.IMAGE);
  }

  static video(): MessageType {
    return new MessageType(MessageTypeEnum.VIDEO);
  }

  static audio(): MessageType {
    return new MessageType(MessageTypeEnum.AUDIO);
  }

  static system(): MessageType {
    return new MessageType(MessageTypeEnum.SYSTEM);
  }

  static fromString(value: string): MessageType {
    const type = Object.values(MessageTypeEnum).find((t) => t === value);
    if (!type) {
      throw new Error(`Invalid message type: ${value}`);
    }
    return new MessageType(type);
  }

  get value(): MessageTypeEnum {
    return this._value;
  }

  get isText(): boolean {
    return this._value === MessageTypeEnum.TEXT;
  }

  get isMedia(): boolean {
    return (
      this._value === MessageTypeEnum.IMAGE ||
      this._value === MessageTypeEnum.VIDEO ||
      this._value === MessageTypeEnum.AUDIO
    );
  }

  get isSystem(): boolean {
    return this._value === MessageTypeEnum.SYSTEM;
  }

  equals(other: MessageType): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  toJSON(): string {
    return this._value;
  }
}
