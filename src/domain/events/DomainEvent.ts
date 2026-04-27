/**
 * Base Domain Event interface
 */
export interface IDomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
}

/**
 * Base class for domain events
 */
export abstract class DomainEvent implements IDomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;

  protected constructor(eventType: string, aggregateId: string) {
    this.eventId = crypto.randomUUID();
    this.eventType = eventType;
    this.occurredAt = new Date();
    this.aggregateId = aggregateId;
  }

  abstract toJSON(): Record<string, unknown>;
}
