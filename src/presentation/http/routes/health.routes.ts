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
    controller.check.bind(controller)
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
    controller.liveness.bind(controller)
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
    controller.readiness.bind(controller)
  );
}
