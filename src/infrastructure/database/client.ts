import { PrismaClient } from './generated';
import { logger } from '@shared/logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'info' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  });

if (process.env.NODE_ENV === 'development') {
  prismaClient.$on('query' as never, (e) => {
    logger.debug({
      query: (e as any).query,
      params: (e as any).params,
      duration: `${(e as any).duration}ms`,
    });
  });
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaClient;
}

export async function disconnectPrisma(): Promise<void> {
  await prismaClient.$disconnect();
  logger.info('Prisma client disconnected');
}

export async function connectPrisma(): Promise<void> {
  try {
    await prismaClient.$connect();
    logger.info('Prisma client connected');
  } catch (error) {
    // In development, allow the service to start without database
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Database not available - running without persistence features');
      return;
    }
    logger.error({ error }, 'Failed to connect to database');
    throw error;
  }
}
