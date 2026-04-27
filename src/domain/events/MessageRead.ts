import { DomainEvent } from './DomainEvent';
import { Message } from '../entities';

/**
 * Event raised when a message is marked as read
 */
export class MessageRead extends DomainEvent {
  readonly message: Message;
  readonly readBy: string;

  constructor(message: Message, readBy: string) {
    super('chat.message.read', message.conversationId.value);
    this.message = message;
    this.readBy = readBy;
  }

  toJSON(): {
    eventId: string;
    eventType: string;
    occurredAt: Date;
    aggregateId: string;
    payload: {
      messageId: string;
      conversationId: string;
      readBy: string;
    };
  } {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt,
      aggregateId: this.aggregateId,
      payload: {
        messageId: this.message.id.value,
        conversationId: this.message.conversationId.value,
        readBy: this.readBy,
      },
    };
  }
}
