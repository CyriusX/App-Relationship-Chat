import 'reflect-metadata';
import { container } from 'tsyringe';

// Import tokens
import {
  PrismaClient,
  RedisClient,
  IConversationRepository,
  IMessageRepository,
  IPresenceRepository,
  IMatchRepository,
  IBlockRepository,
  ICacheService,
  INotificationClient,
  IMatchValidator,
  CreateConversationUseCase as CreateConversationUseCaseToken,
} from './tokens';

// Import infrastructure
import { prismaClient } from '@infrastructure/database/client';
import { redisClient } from '@infrastructure/cache/redis-client';
import {
  RedisCacheService,
  type ICacheService as ICacheServiceType,
} from '@infrastructure/cache/RedisCacheService';
import {
  NotificationHttpClient,
  type INotificationClient as INotificationClientType,
} from '@infrastructure/http/NotificationHttpClient';
import {
  MatchValidatorClient,
  type IMatchValidator as IMatchValidatorType,
} from '@infrastructure/http/MatchValidatorClient';

// Import repositories
import { MessageRepository } from '@infrastructure/database/repositories/MessageRepository';
import { ConversationRepository } from '@infrastructure/database/repositories/ConversationRepository';
import { PresenceRepository } from '@infrastructure/cache/PresenceRepository';
import { MatchRepository } from '@infrastructure/database/repositories/MatchRepository';
import { BlockRepository } from '@infrastructure/database/repositories/BlockRepository';

// Import use cases
import { CreateConversationUseCase } from '@application/use-cases/conversation';

/**
 * Configure the dependency injection container
 */
export function setupContainer(): void {
  // Register Prisma client (singleton)
  container.registerInstance(PrismaClient, prismaClient);

  // Register Redis client (singleton)
  container.registerInstance(RedisClient, redisClient);

  // Register cache service
  container.registerSingleton<ICacheServiceType>(ICacheService, RedisCacheService);

  // Register HTTP clients
  container.registerSingleton<INotificationClientType>(INotificationClient, NotificationHttpClient);
  container.registerSingleton<IMatchValidatorType>(IMatchValidator, MatchValidatorClient);

  // Register repositories
  container.registerSingleton(IConversationRepository as symbol, ConversationRepository);
  container.registerSingleton(IMessageRepository as symbol, MessageRepository);
  container.registerSingleton(IPresenceRepository as symbol, PresenceRepository);
  container.registerSingleton(IMatchRepository as symbol, MatchRepository);
  container.registerSingleton(IBlockRepository as symbol, BlockRepository);

  // Register use cases
  container.registerSingleton(CreateConversationUseCaseToken as symbol, CreateConversationUseCase);
}

export { container };
