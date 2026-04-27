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

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
): Promise<void> {
  try {
    const decoded = await request.jwtVerify();

    if (!isValidJwtPayload(decoded)) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid token payload',
      });
    }

    // Store typed payload in request
    (request as FastifyRequest & { userPayload: JwtPayload }).userPayload = decoded;
    done();
  } catch (error) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Authentication failed',
    });
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
