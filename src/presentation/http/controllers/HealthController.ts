import type { FastifyRequest, FastifyReply } from 'fastify';
import { prismaClient } from '@infrastructure/database/client';
import { redisClient } from '@infrastructure/cache';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
  };
}

interface HealthCheck {
  status: 'up' | 'down';
  latency?: number;
  error?: string;
}

const VERSION = '1.0.0';

export class HealthController {
  async check(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const dbCheck = await this.checkDatabase();
    const redisCheck = await this.checkRedis();
    const status = this.determineStatus(dbCheck, redisCheck);

    const response: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: VERSION,
      checks: {
        database: dbCheck,
        redis: redisCheck,
      },
    };

    const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
    reply.status(statusCode).send(response);
  }

  async liveness(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.status(200).send({ status: 'ok' });
  }

  async readiness(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const dbCheck = await this.checkDatabase();
    const redisCheck = await this.checkRedis();

    if (dbCheck.status === 'down' || redisCheck.status === 'down') {
      reply.status(503).send({ status: 'not ready' });
      return;
    }

    reply.status(200).send({ status: 'ready' });
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await prismaClient.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await redisClient.ping();
      return {
        status: 'up',
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private determineStatus(dbCheck: HealthCheck, redisCheck: HealthCheck): HealthStatus['status'] {
    if (dbCheck.status === 'down') {
      return 'unhealthy';
    }

    if (redisCheck.status === 'down') {
      return 'degraded'; // Can work without Redis (no multi-instance support)
    }

    return 'healthy';
  }
}
