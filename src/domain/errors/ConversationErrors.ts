/**
 * Base error class for domain errors
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// ============================================
// Conversation Errors
// ============================================

export class ConversationNotFoundError extends DomainError {
  constructor(conversationId: string) {
    super(`Conversation with ID "${conversationId}" not found`);
  }
}

export class ConversationAlreadyExistsError extends DomainError {
  constructor(userAId: string, userBId: string) {
    super(`Conversation between users "${userAId}" and "${userBId}" already exists`);
  }
}

export class UserNotParticipantError extends DomainError {
  constructor(userId: string, conversationId: string) {
    super(`User "${userId}" is not a participant in conversation "${conversationId}"`);
  }
}

// ============================================
// Message Errors
// ============================================

export class MessageNotFoundError extends DomainError {
  constructor(messageId: string) {
    super(`Message with ID "${messageId}" not found`);
  }
}

export class MessageAlreadyDeletedError extends DomainError {
  constructor(messageId: string) {
    super(`Message "${messageId}" is already deleted`);
  }
}

export class CannotEditDeletedMessageError extends DomainError {
  constructor() {
    super('Cannot edit a deleted message');
  }
}

export class CannotSetMediaUrlError extends DomainError {
  constructor() {
    super('Cannot set media URL for non-media message');
  }
}

export class InvalidMessageStatusTransitionError extends DomainError {
  constructor(fromStatus: string, toStatus: string) {
    super(`Cannot transition message status from "${fromStatus}" to "${toStatus}"`);
  }
}

// ============================================
// Authorization Errors
// ============================================

export class ChatNotAuthorizedError extends DomainError {
  constructor(reason: string = 'No match exists between users') {
    super(`Chat not authorized: ${reason}`);
  }
}

export class UserBlockedError extends DomainError {
  constructor(blockedBy: string) {
    super(`User has been blocked by "${blockedBy}"`);
  }
}
