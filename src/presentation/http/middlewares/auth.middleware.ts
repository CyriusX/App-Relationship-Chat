import { assertAccountActive } from '@infrastructure/privacy/AccountAccess';
import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';

export interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

function isValidJwtPayload(payload: unknown): payload is JwtPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'userId' in payload &&
    typeof (payload as JwtPayload).userId === 'string'
  );
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const decoded = await request.jwtVerify();

    if (!isValidJwtPayload(decoded)) {
      reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid token payload',
      });
      return;
    }

    await assertAccountActive(decoded.userId);

    (request as FastifyRequest & { userPayload: JwtPayload }).userPayload = decoded;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      error.statusCode === 503
    )
      throw error;
    reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Authentication failed',
    });
    return;
  }
}

export function optionalAuthMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
  done: HookHandlerDoneFunction
): void {
  request
    .jwtVerify()
    .then((decoded) => {
      if (isValidJwtPayload(decoded)) {
        (request as FastifyRequest & { userPayload: JwtPayload }).userPayload = decoded;
      }
    })
    .catch(() => {
      // Ignore - optional auth
    });
  done();
}
