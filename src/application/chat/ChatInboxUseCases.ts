import { z } from 'zod';
import type { IChatInboxRepository } from '@domain/chat/IChatInboxRepository';
const uuid = z.string().uuid();
const content = z
  .string()
  .max(5000)
  .refine((v) => v.trim().length > 0, 'Escreva uma mensagem.');
const page = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).optional(),
  cursor: z.string().max(500).optional(),
  q: z.string().trim().max(100).optional(),
  unreadOnly: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional()
  ),
});
export class ChatInboxUseCases {
  constructor(private readonly repository: IChatInboxRepository) {}
  list(userId: string, query: unknown) {
    return this.repository.list(uuid.parse(userId), page.parse(query));
  }
  summary(userId: string) {
    return this.repository.summary(uuid.parse(userId));
  }
  open(userId: string, body: unknown) {
    const input = z.object({ userAId: uuid, userBId: uuid, matchId: uuid.optional() }).parse(body);
    if (input.userAId !== userId && input.userBId !== userId)
      throw Object.assign(new Error('Conversa indisponível.'), { statusCode: 403 });
    const other = input.userAId === userId ? input.userBId : input.userAId;
    if (other === userId)
      throw Object.assign(new Error('Participantes inválidos.'), { statusCode: 400 });
    return this.repository.open(uuid.parse(userId), other, input.matchId);
  }
  get(userId: string, id: string) {
    return this.repository.get(uuid.parse(userId), uuid.parse(id));
  }
  history(userId: string, id: string, query: unknown) {
    const input = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(50),
        cursor: z.string().max(500).optional(),
        before: z.string().datetime().optional(),
      })
      .parse(query);
    return this.repository.history(
      uuid.parse(userId),
      uuid.parse(id),
      input.limit,
      input.cursor,
      input.before
    );
  }
  send(userId: string, id: string, body: unknown) {
    const input = z
      .object({
        clientMessageId: uuid.optional(),
        content,
        type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO']).default('TEXT'),
        replyToId: uuid.optional(),
        mediaUrl: z.string().url().max(500).optional(),
      })
      .parse(body);
    return this.repository.send(uuid.parse(userId), { ...input, conversationId: uuid.parse(id) });
  }
  read(userId: string, id: string, body: unknown) {
    const input = z.object({ lastReadMessageId: uuid.optional() }).parse(body ?? {});
    return this.repository.read(uuid.parse(userId), uuid.parse(id), input.lastReadMessageId);
  }
  change(userId: string, id: string, body: unknown | null) {
    const input =
      body === null
        ? null
        : z
            .object({ content, expectedEditedAt: z.string().datetime().nullable().optional() })
            .parse(body);
    return this.repository.change(
      uuid.parse(userId),
      uuid.parse(id),
      input?.content ?? null,
      input?.expectedEditedAt
    );
  }
}
