import { DomainEvent } from './DomainEvent';
import { Message } from '../entities';

/**
 * Event raised when a message is edited
 */
export class MessageEdited extends DomainEvent {
  readonly message: Message;
  readonly previousContent: string;

  constructor(message: Message, previousContent: string) {
    super('chat.message.edited', message.conversationId.value);
    this.message = message;
    this.previousContent = previousContent;
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
      editedAt: Date;
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
        editedAt: this.message.editedAt!,
      },
    };
  }
}
