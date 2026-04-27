/**
 * Dependency Injection Tokens
 * Use Symbols to avoid naming collisions
 */

// Repositories
export const IConversationRepository = Symbol.for('IConversationRepository');
export const IMessageRepository = Symbol.for('IMessageRepository');
export const IPresenceRepository = Symbol.for('IPresenceRepository');
export const IMatchRepository = Symbol.for('IMatchRepository');
export const IBlockRepository = Symbol.for('IBlockRepository');

// Services
export const ICacheService = Symbol.for('ICacheService');
export const INotificationClient = Symbol.for('INotificationClient');
export const IMatchValidator = Symbol.for('IMatchValidator');
export const ISocketServer = Symbol.for('ISocketServer');

// Use Cases
export const CreateConversationUseCase = Symbol.for('CreateConversationUseCase');

// External
export const PrismaClient = Symbol.for('PrismaClient');
export const RedisClient = Symbol.for('RedisClient');
