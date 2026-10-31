import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { JwtPayload } from '../middlewares/auth.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { chatInbox } from '@infrastructure/chat/inbox';
const actor = (r: FastifyRequest) =>
  (r as FastifyRequest & { userPayload: JwtPayload }).userPayload.userId;
export async function messageRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('X-Server-Time', new Date().toISOString());
    return payload;
  });
  app.get<{ Params: { conversationId: string } }>(
    '/conversations/:conversationId/messages',
    { preHandler: authMiddleware },
    (r) => chatInbox.history(actor(r), r.params.conversationId, r.query)
  );
  app.post<{ Params: { conversationId: string } }>(
    '/conversations/:conversationId/messages',
    { preHandler: authMiddleware },
    async (r, reply) =>
      reply.code(201).send(await chatInbox.send(actor(r), r.params.conversationId, r.body))
  );
  app.post<{ Params: { conversationId: string } }>(
    '/conversations/:conversationId/read',
    { preHandler: authMiddleware },
    (r) => chatInbox.read(actor(r), r.params.conversationId, r.body)
  );
  app.patch<{ Params: { messageId: string } }>(
    '/messages/:messageId',
    { preHandler: authMiddleware },
    (r) => chatInbox.change(actor(r), r.params.messageId, r.body)
  );
  app.delete<{ Params: { messageId: string } }>(
    '/messages/:messageId',
    { preHandler: authMiddleware },
    async (r, reply) => {
      await chatInbox.change(actor(r), r.params.messageId, null);
      return reply.code(204).send();
    }
  );
}
