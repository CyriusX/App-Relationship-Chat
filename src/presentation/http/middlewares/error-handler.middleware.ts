import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { logger } from '@shared/logger';

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): FastifyReply {
  const requestId = request.id;

  // Log the error
  logger.error({
    requestId,
    error: {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
    },
    url: request.url,
    method: request.method,
  });

  // Zod validation errors
  if (error instanceof ZodError) {
    const response: ErrorResponse = {
      statusCode: 400,
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.errors,
    };
    return reply.status(400).send(response);
  }

  // Known HTTP errors
  if (error.statusCode) {
    const response: ErrorResponse = {
      statusCode: error.statusCode,
      error: error.name || 'Error',
      message: error.message,
    };
    return reply.status(error.statusCode).send(response);
  }

  // Unknown errors
  const response: ErrorResponse = {
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  };

  return reply.status(500).send(response);
}
