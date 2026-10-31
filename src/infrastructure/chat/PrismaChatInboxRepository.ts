import { lockParticipants } from './participant-lock';
import { commandIdentity, canParticipate, publicAge } from '@domain/chat/ChatPolicy';
import { randomUUID, createHash } from 'node:crypto';
import { Prisma } from '../database/generated';
import { prismaClient as db } from '../database/client';
import type {
  IChatInboxRepository,
  InboxConversation,
  InboxMessage,
  SendInboxMessage,
  ConversationQuery,
} from '@domain/chat/IChatInboxRepository';
const fail = (message: string, statusCode = 403) =>
  Object.assign(new Error(message), { statusCode });
type Client = Prisma.TransactionClient;
type Conv = {
  id: string;
  userAId: string;
  userBId: string;
  matchId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
};
export function safeMessage(m: InboxMessage) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    clientMessageId: m.clientMessageId,
    content: m.deletedAt ? null : m.content,
    type: m.type,
    status: m.status,
    replyToId: m.replyToId,
    mediaUrl: m.mediaUrl,
    editedAt: m.editedAt,
    deletedAt: m.deletedAt,
    createdAt: m.createdAt,
    isEdited: !!m.editedAt,
    isDeleted: !!m.deletedAt,
  };
}
function encode(date: Date, id: string) {
  return Buffer.from(JSON.stringify([date.toISOString(), id])).toString('base64url');
}
function decode(value: string): { date: Date; id: string } {
  try {
    const a: unknown = JSON.parse(Buffer.from(value, 'base64url').toString());
    if (
      !Array.isArray(a) ||
      a.length !== 2 ||
      typeof a[0] !== 'string' ||
      typeof a[1] !== 'string' ||
      !Number.isFinite(Date.parse(a[0]))
    )
      throw Error();
    return { date: new Date(a[0]), id: a[1] };
  } catch {
    throw fail('Cursor inválido.', 400);
  }
}
async function excluded(tx: Client, userId: string) {
  const rows = await tx.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId));
}
async function access(tx: Client, userId: string, id: string, writing = false): Promise<Conv> {
  const c = await tx.conversation.findUnique({ where: { id } });
  if (!c || !canParticipate(userId, c)) throw fail('Conversa indisponível.', 404);
  const other = c.userAId === userId ? c.userBId : c.userAId;
  if (writing) await lockParticipants(tx, [userId, other]);
  if ((await excluded(tx, userId)).includes(other)) throw fail('Conversa indisponível.');
  if (writing) {
    const active = await tx.user.count({
      where: { id: { in: [userId, other] }, status: 'ACTIVE' },
    });
    if (active !== 2) throw fail('Esta conta não está disponível para mensagens.');
  }
  return c;
}
async function outbox(tx: Client, eventType: string, payload: object) {
  await tx.chatInboxOutbox.create({
    data: {
      id: randomUUID(),
      eventType,
      payload: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue,
    },
  });
}
const unread = (userId: string): Prisma.MessageWhereInput => ({
  senderId: { not: userId },
  deletedAt: null,
  readReceipts: { none: { userId } },
});
export class PrismaChatInboxRepository implements IChatInboxRepository {
  private async visible(userId: string): Promise<Prisma.ConversationWhereInput> {
    const blocked = await excluded(db, userId);
    return {
      OR: [{ userAId: userId }, { userBId: userId }],
      NOT: [{ userAId: { in: blocked } }, { userBId: { in: blocked } }],
    };
  }
  private async present(c: Conv, userId: string): Promise<InboxConversation> {
    return (await this.presentMany([c], userId))[0];
  }
  private async presentMany(conversations: Conv[], userId: string): Promise<InboxConversation[]> {
    if (!conversations.length) return [];
    const ids = conversations.map((c) => c.id),
      others = conversations.map((c) => (c.userAId === userId ? c.userBId : c.userAId));
    // Batch the page: query count stays bounded as the inbox grows.
    const [accounts, profiles, photos, prefs, latest, counts] = await Promise.all([
      db.user.findMany({ where: { id: { in: others } }, select: { id: true, status: true } }),
      db.profile.findMany({
        where: { userId: { in: others } },
        select: { userId: true, displayName: true, birthDate: true },
      }),
      db.media.findMany({
        where: { userId: { in: others }, type: 'PHOTO', status: 'READY', deletedAt: null },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { userId: true, url: true },
      }),
      db.$queryRaw<
        { user_id: string; show_age: boolean }[]
      >`SELECT user_id,show_age FROM user_preferences WHERE user_id IN (${Prisma.join(others)})`,
      db.$queryRaw<
        {
          id: string;
          conversationId: string;
          senderId: string;
          content: string | null;
          deletedAt: Date | null;
          createdAt: Date;
        }[]
      >`SELECT DISTINCT ON (conversation_id) id,conversation_id AS "conversationId",sender_id AS "senderId",content,deleted_at AS "deletedAt",created_at AS "createdAt" FROM chat_messages WHERE conversation_id IN (${Prisma.join(ids)}) ORDER BY conversation_id,created_at DESC,id DESC`,
      db.message.groupBy({
        by: ['conversationId'],
        where: { conversationId: { in: ids }, ...unread(userId) },
        _count: { _all: true },
      }),
    ]);
    const accountMap = new Map(accounts.map((a) => [a.id, a])),
      profileMap = new Map(profiles.map((p) => [p.userId, p])),
      prefMap = new Map(prefs.map((p) => [p.user_id, p.show_age])),
      latestMap = new Map(latest.map((m) => [m.conversationId, m])),
      countMap = new Map(counts.map((c) => [c.conversationId, c._count._all]));
    const photoMap = new Map<string, string | null>();
    for (const p of photos) if (!photoMap.has(p.userId)) photoMap.set(p.userId, p.url);
    return conversations.map((c) => {
      const otherId = c.userAId === userId ? c.userBId : c.userAId,
        profile = profileMap.get(otherId),
        available = accountMap.get(otherId)?.status === 'ACTIVE',
        last = latestMap.get(c.id);
      return {
        ...c,
        otherUser: {
          id: otherId,
          displayName: available ? (profile?.displayName ?? 'Usuário') : 'Usuário excluído',
          age: publicAge(profile?.birthDate ?? null, prefMap.get(otherId) !== false, available),
          photoUrl: available ? (photoMap.get(otherId) ?? null) : null,
          available,
        },
        lastMessage: last
          ? {
              id: last.id,
              senderId: last.senderId,
              preview: last.deletedAt ? 'Mensagem excluída' : (last.content ?? '').slice(0, 200),
              createdAt: last.createdAt,
            }
          : null,
        unreadCount: countMap.get(c.id) ?? 0,
      };
    });
  }
  async list(userId: string, query: ConversationQuery) {
    const allowed = await this.visible(userId);
    let searched: string[] | undefined;
    if (query.q) {
      const rows = await db.profile.findMany({
        where: { displayName: { contains: query.q, mode: 'insensitive' } },
        select: { userId: true },
      });
      searched = rows.map((p) => p.userId);
    }
    const base: Prisma.ConversationWhereInput = {
      AND: [
        allowed,
        ...(searched
          ? [
              {
                OR: [
                  { userAId: userId, userBId: { in: searched } },
                  { userBId: userId, userAId: { in: searched } },
                ],
              },
            ]
          : []),
        ...(query.unreadOnly ? [{ messages: { some: unread(userId) } }] : []),
      ],
    };
    const cursor = query.cursor ? decode(query.cursor) : null;
    const where: Prisma.ConversationWhereInput = cursor
      ? {
          AND: [
            base,
            {
              OR: [
                { lastMessageAt: { lt: cursor.date } },
                { lastMessageAt: cursor.date, id: { lt: cursor.id } },
              ],
            },
          ],
        }
      : base;
    const [rows, total] = await Promise.all([
      db.conversation.findMany({
        where,
        orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
        skip: cursor ? 0 : (query.offset ?? 0),
      }),
      db.conversation.count({ where: base }),
    ]);
    const page = rows.slice(0, query.limit),
      last = page[page.length - 1],
      hasMore = rows.length > query.limit;
    return {
      conversations: await this.presentMany(page, userId),
      total,
      hasMore,
      nextCursor: hasMore && last ? encode(last.lastMessageAt, last.id) : null,
    };
  }
  async summary(userId: string) {
    const visible = await this.visible(userId);
    const [unreadMessages, unreadConversations] = await Promise.all([
      db.message.count({ where: { ...unread(userId), conversation: visible } }),
      db.conversation.count({ where: { AND: [visible, { messages: { some: unread(userId) } }] } }),
    ]);
    return { unreadMessages, unreadConversations };
  }
  async open(userId: string, otherUserId: string, matchId?: string) {
    const c = await db.$transaction(
      async (tx) => {
        const pairKey = 'pair:' + [userId, otherUserId].sort().join(':');
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${pairKey}))`;
        await lockParticipants(tx, [userId, otherUserId]);
        const match = await tx.match.findFirst({
          where: {
            OR: [
              { userAId: userId, userBId: otherUserId },
              { userAId: otherUserId, userBId: userId },
            ],
          },
        });
        if (!match || (matchId && match.id !== matchId)) throw fail('Match indisponível.');
        if ((await excluded(tx, userId)).includes(otherUserId))
          throw fail('Conversa indisponível.');
        if (
          (await tx.user.count({
            where: { id: { in: [userId, otherUserId] }, status: 'ACTIVE' },
          })) !== 2
        )
          throw fail('Conta indisponível.');
        const [userAId, userBId] = [userId, otherUserId].sort();
        return tx.conversation.upsert({
          where: { userAId_userBId: { userAId, userBId } },
          create: { userAId, userBId, matchId: match.id },
          update: {},
        });
      },
      { timeout: 20000, maxWait: 15000 }
    );
    return this.present(c, userId);
  }
  async get(userId: string, id: string) {
    return this.present(await access(db, userId, id), userId);
  }
  async history(
    userId: string,
    conversationId: string,
    limit: number,
    cursor?: string,
    before?: string
  ) {
    await access(db, userId, conversationId);
    const key = cursor ? decode(cursor) : null;
    const rows = await db.message.findMany({
      where: {
        conversationId,
        ...(key
          ? { OR: [{ createdAt: { lt: key.date } }, { createdAt: key.date, id: { lt: key.id } }] }
          : before
            ? { createdAt: { lt: new Date(before) } }
            : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: { readReceipts: { select: { userId: true } } },
    });
    const page = rows.slice(0, limit),
      last = page[page.length - 1],
      hasMore = rows.length > limit;
    return {
      messages: page.reverse().map((m) =>
        safeMessage({
          ...m,
          status: m.readReceipts.some((r) => r.userId !== m.senderId) ? 'READ' : m.status,
        })
      ),
      hasMore,
      nextCursor: hasMore && last ? encode(last.createdAt, last.id) : null,
    };
  }
  async send(userId: string, input: SendInboxMessage): Promise<InboxMessage> {
    const hash = createHash('sha256').update(commandIdentity(input)).digest('hex');
    return db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.conversationId}))`;
        const c = await access(tx, userId, input.conversationId, true);
        if (input.clientMessageId) {
          const old = await tx.message.findUnique({
            where: {
              senderId_conversationId_clientMessageId: {
                senderId: userId,
                conversationId: c.id,
                clientMessageId: input.clientMessageId,
              },
            },
          });
          if (old) {
            if (old.clientCommandHash !== hash)
              throw fail('Identificador reutilizado com outra mensagem.', 409);
            return safeMessage(old);
          }
        }
        if (
          input.replyToId &&
          !(await tx.message.findFirst({ where: { id: input.replyToId, conversationId: c.id } }))
        )
          throw fail('Mensagem de referência inválida.', 400);
        const createdAt = new Date(Math.max(Date.now(), c.lastMessageAt.getTime() + 1));
        const m = await tx.message.create({
          data: {
            conversationId: c.id,
            senderId: userId,
            content: input.content,
            type: input.type ?? 'TEXT',
            clientMessageId: input.clientMessageId ?? null,
            clientCommandHash: input.clientMessageId ? hash : null,
            replyToId: input.replyToId ?? null,
            mediaUrl: input.mediaUrl ?? null,
            createdAt,
          },
        });
        await tx.conversation.update({ where: { id: c.id }, data: { lastMessageAt: createdAt } });
        await outbox(tx, 'message:new', {
          message: safeMessage(m),
          userAId: c.userAId,
          userBId: c.userBId,
        });
        return safeMessage(m);
      },
      { timeout: 20000, maxWait: 15000 }
    );
  }
  async read(userId: string, conversationId: string, lastReadMessageId?: string) {
    return db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${conversationId}))`;
        const c = await access(tx, userId, conversationId);
        const boundary = lastReadMessageId
          ? await tx.message.findFirst({ where: { id: lastReadMessageId, conversationId } })
          : await tx.message.findFirst({
              where: { conversationId },
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            });
        if (lastReadMessageId && !boundary) throw fail('Mensagem inválida.', 400);
        if (!boundary) return { count: 0 };
        const rows = await tx.message.findMany({
          where: {
            conversationId,
            ...unread(userId),
            OR: [
              { createdAt: { lt: boundary.createdAt } },
              { createdAt: boundary.createdAt, id: { lte: boundary.id } },
            ],
          },
          select: { id: true },
        });
        if (!rows.length) return { count: 0 };
        const ids = rows.map((m) => m.id);
        await tx.messageReadReceipt.createMany({
          data: ids.map((messageId) => ({ messageId, userId })),
          skipDuplicates: true,
        });
        await tx.message.updateMany({ where: { id: { in: ids } }, data: { status: 'READ' } });
        await outbox(tx, 'messages:read', {
          conversationId,
          userId,
          messageIds: ids,
          userAId: c.userAId,
          userBId: c.userBId,
        });
        return { count: rows.length };
      },
      { timeout: 20000, maxWait: 15000 }
    );
  }
  async change(userId: string, messageId: string, content: string | null) {
    return db.$transaction(async (tx) => {
      const old = await tx.message.findUnique({ where: { id: messageId } });
      if (!old || old.senderId !== userId || old.deletedAt)
        throw fail('Mensagem indisponível.', 404);
      const c = await access(tx, userId, old.conversationId, true);
      if (!(await tx.message.findFirst({ where: { id: messageId, deletedAt: null } })))
        throw fail('Mensagem indisponível.', 404);
      const m = await tx.message.update({
        where: { id: messageId },
        data: content === null ? { deletedAt: new Date() } : { content, editedAt: new Date() },
      });
      await outbox(tx, content === null ? 'message:deleted' : 'message:edited', {
        message: safeMessage(m),
        userAId: c.userAId,
        userBId: c.userBId,
      });
      return safeMessage(m);
    });
  }
}
