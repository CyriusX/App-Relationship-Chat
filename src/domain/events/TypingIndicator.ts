import { DomainEvent } from './DomainEvent';

/**
 * Event raised when a user starts typing
 */
export class TypingStarted extends DomainEvent {
  readonly userId: string;
  readonly conversationId: string;

  constructor(conversationId: string, userId: string) {
    super('chat.typing.started', conversationId);
    this.conversationId = conversationId;
    this.userId = userId;
  }

  toJSON(): {
    eventId: string;
    eventType: string;
    occurredAt: Date;
    aggregateId: string;
    payload: {
      conversationId: string;
      userId: string;
    };
  } {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt,
      aggregateId: this.aggregateId,
      payload: {
        conversationId: this.conversationId,
        userId: this.userId,
      },
    };
  }
}

/**
 * Event raised when a user stops typing
 */
export class TypingStopped extends DomainEvent {
  readonly userId: string;
  readonly conversationId: string;

  constructor(conversationId: string, userId: string) {
    super('chat.typing.stopped', conversationId);
    this.conversationId = conversationId;
    this.userId = userId;
  }

  toJSON(): {
    eventId: string;
    eventType: string;
    occurredAt: Date;
    aggregateId: string;
    payload: {
      conversationId: string;
      userId: string;
    };
  } {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt,
      aggregateId: this.aggregateId,
      payload: {
        conversationId: this.conversationId,
        userId: this.userId,
      },
    };
  }
}
