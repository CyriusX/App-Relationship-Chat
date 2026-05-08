import type { FastifyInstance } from 'fastify';
import { HealthController } from '../controllers/HealthController';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = new HealthController();

  // Full health check with dependencies
  fastify.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        description: 'Full health check including database and Redis',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              uptime: { type: 'number' },
              version: { type: 'string' },
              checks: {
                type: 'object',
                properties: {
                  database: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      latency: { type: 'number' },
                      error: { type: 'string' },
                    },
                  },
                  redis: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      latency: { type: 'number' },
                      error: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      await controller.check(request, reply);
    }
  );

  // Kubernetes liveness probe
  fastify.get(
    '/health/live',
    {
      schema: {
        tags: ['Health'],
        description: 'Liveness probe - is the service running?',
      },
    },
    async (request, reply) => {
      await controller.liveness(request, reply);
    }
  );

  // Kubernetes readiness probe
  fastify.get(
    '/health/ready',
    {
      schema: {
        tags: ['Health'],
        description: 'Readiness probe - is the service ready to accept traffic?',
      },
    },
    async (request, reply) => {
      await controller.readiness(request, reply);
    }
  );
}
