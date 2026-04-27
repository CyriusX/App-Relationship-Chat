import { DomainEvent } from './DomainEvent';
import { PresenceStatus } from '../value-objects';

/**
 * Event raised when a user's presence changes
 */
export class UserPresenceChanged extends DomainEvent {
  readonly userId: string;
  readonly status: PresenceStatus;
  readonly lastSeen: Date | null;

  constructor(userId: string, status: PresenceStatus, lastSeen: Date | null = null) {
    super('chat.presence.changed', userId);
    this.userId = userId;
    this.status = status;
    this.lastSeen = lastSeen;
  }

  toJSON(): {
    eventId: string;
    eventType: string;
    occurredAt: Date;
    aggregateId: string;
    payload: {
      userId: string;
      status: string;
      lastSeen: string | null;
    };
  } {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt,
      aggregateId: this.aggregateId,
      payload: {
        userId: this.userId,
        status: this.status.value,
        lastSeen: this.lastSeen ? this.lastSeen.toISOString() : null,
      },
    };
  }
}
