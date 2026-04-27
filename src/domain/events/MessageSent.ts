import { DomainEvent } from './DomainEvent';
import { Message } from '../entities';

/**
 * Event raised when a new message is sent
 */
export class MessageSent extends DomainEvent {
  readonly message: Message;

  constructor(message: Message) {
    super('chat.message.sent', message.conversationId.value);
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
      receiverId: string;
      preview: string;
    };
  } {
    const receiverId = this.message.senderId; // Will be determined by use case

    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt,
      aggregateId: this.aggregateId,
      payload: {
        messageId: this.message.id.value,
        conversationId: this.message.conversationId.value,
        senderId: this.message.senderId,
        receiverId: receiverId,
        preview: this.message.content.preview,
      },
    };
  }
}
