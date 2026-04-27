import { DomainEvent } from './DomainEvent';
import { Conversation } from '../entities';

/**
 * Event raised when a new conversation is created
 */
export class ConversationCreated extends DomainEvent {
  readonly conversation: Conversation;

  constructor(conversation: Conversation) {
    super('chat.conversation.created', conversation.id.value);
    this.conversation = conversation;
  }

  toJSON(): {
    eventId: string;
    eventType: string;
    occurredAt: Date;
    aggregateId: string;
    payload: {
      conversationId: string;
      userAId: string;
      userBId: string;
      matchId: string | null;
    };
  } {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt,
      aggregateId: this.aggregateId,
      payload: {
        conversationId: this.conversation.id.value,
        userAId: this.conversation.userAId,
        userBId: this.conversation.userBId,
        matchId: this.conversation.matchId,
      },
    };
  }
}
