import { DomainEvent } from './DomainEvent';
import { Message } from '../entities';

/**
 * Event raised when a message is deleted (soft delete)
 */
export class MessageDeleted extends DomainEvent {
  readonly message: Message;

  constructor(message: Message) {
    super('chat.message.deleted', message.conversationId.value);
    this.message = message;
  }

  toJSON(): {
    eventId: string;
    eventType: string;
    occurredAt: Date;
    aggregateId: string;
    payload: {
      messageId: string;
      conversationId: string;
      senderId: string;
      deletedAt: Date;
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
        senderId: this.message.senderId,
        deletedAt: this.message.deletedAt!,
      },
    };
  }
}
