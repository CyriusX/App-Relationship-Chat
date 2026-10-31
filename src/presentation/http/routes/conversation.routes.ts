import type { FastifyInstance, FastifyRequest } from 'fastify';
import { authMiddleware } from '../middlewares/auth.middleware';
import { chatInbox } from '@infrastructure/chat/inbox';
import type { JwtPayload } from '../middlewares/auth.middleware';
const actor = (r: FastifyRequest) =>
  (r as FastifyRequest & { userPayload: JwtPayload }).userPayload.userId;
export async function conversationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/conversations/summary', { preHandler: authMiddleware }, (r) =>
    chatInbox.summary(actor(r))
  );
  app.get('/conversations', { preHandler: authMiddleware }, (r) =>
    chatInbox.list(actor(r), r.query)
  );
  app.get<{ Params: { conversationId: string } }>(
    '/conversations/:conversationId',
    { preHandler: authMiddleware },
    (r) => chatInbox.get(actor(r), r.params.conversationId)
  );
  app.post('/conversations', { preHandler: authMiddleware }, async (r, reply) =>
    reply.send({ success: true, data: await chatInbox.open(actor(r), r.body) })
  );
}
