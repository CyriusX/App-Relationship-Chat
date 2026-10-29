import type { FastifyRequest, FastifyReply } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
export async function internalPrivacyAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const expected =
    process.env['INTERNAL_API_KEY'] ??
    process.env['INTERNAL_TOKEN'] ??
    process.env['CORE_INTERNAL_TOKEN'] ??
    process.env['CORE_SERVICE_API_KEY'];
  const supplied = request.headers['x-internal-api-key'];
  if (
    !expected ||
    typeof supplied !== 'string' ||
    Buffer.byteLength(supplied) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  ) {
    await reply.code(401).send({ error: 'Unauthorized' });
  }
}
