import type { Server } from 'socket.io';
import { prismaClient as db } from '../database/client';
import { NotificationHttpClient } from '../http/NotificationHttpClient';
import type { InboxMessage } from '@domain/chat/IChatInboxRepository';
import { safeMessage } from './PrismaChatInboxRepository';
import { lockParticipants } from './participant-lock';
interface Payload {
  message?: InboxMessage;
  userAId: string;
  userBId: string;
  conversationId?: string;
  userId?: string;
  messageIds?: string[];
}
/** Chat delivery and notification delivery have independent durable lanes. An unavailable
 * notification service must never delay another conversation or mark its event successful. */
export function startInboxOutbox(io: Server): () => void {
  const notifications = new NotificationHttpClient();
  let chatRunning = false,
    notificationRunning = false,
    stopped = false,
    ticks = 0;
  async function drain(notification: boolean) {
    if (stopped || (notification ? notificationRunning : chatRunning)) return;
    if (notification) notificationRunning = true;
    else chatRunning = true;
    try {
      for (let i = 0; i < (notification ? 1 : 20) && !stopped; i++) {
        const found = await db.$transaction(
          async (tx) => {
            const rows = notification
              ? await tx.$queryRaw<
                  { id: string; event_type: string; payload: Payload; attempts: number }[]
                >`SELECT id,event_type,payload,attempts FROM chat_inbox_outbox WHERE processed_at IS NULL AND event_type='notification:message' AND next_attempt_at<=NOW() ORDER BY next_attempt_at,created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED`
              : await tx.$queryRaw<
                  { id: string; event_type: string; payload: Payload; attempts: number }[]
                >`SELECT id,event_type,payload,attempts FROM chat_inbox_outbox WHERE processed_at IS NULL AND event_type<>'notification:message' AND next_attempt_at<=NOW() ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED`;
            const e = rows[0];
            if (!e) return false;
            const p = e.payload;
            try {
              if (!notification) await lockParticipants(tx, [p.userAId, p.userBId]);
              const blocked = await tx.block.count({
                where: {
                  OR: [
                    { blockerId: p.userAId, blockedId: p.userBId },
                    { blockerId: p.userBId, blockedId: p.userAId },
                  ],
                },
              });
              const active = await tx.user.count({
                where: { id: { in: [p.userAId, p.userBId] }, status: 'ACTIVE' },
              });
              if (!blocked && active === 2) {
                if (p.message) {
                  const current = await tx.message.findUnique({ where: { id: p.message.id } });
                  if (current) {
                    const m = safeMessage(current),
                      recipient = m.senderId === p.userAId ? p.userBId : p.userAId;
                    if (notification) {
                      if (!current.deletedAt)
                        await notifications.sendMessageSentEvent({
                          conversationId: m.conversationId,
                          messageId: m.id,
                          senderId: m.senderId,
                          receiverId: recipient,
                          preview: (m.content ?? '').slice(0, 200),
                          occurredAt: new Date(String(p.message.createdAt)).toISOString(),
                        });
                    } else if (e.event_type === 'message:new') {
                      io.to(`user:${m.senderId}`).emit('message:sent', m);
                      io.to(`user:${recipient}`).emit('message:new', m);
                      if (!current.deletedAt)
                        await tx.chatInboxOutbox.upsert({
                          where: { id: 'notification:' + m.id },
                          create: {
                            id: 'notification:' + m.id,
                            eventType: 'notification:message',
                            payload: JSON.parse(JSON.stringify(p)),
                          },
                          update: {},
                        });
                    } else io.to(`user:${p.userAId}`).to(`user:${p.userBId}`).emit(e.event_type, m);
                  }
                } else
                  io.to(`user:${p.userAId}`).to(`user:${p.userBId}`).emit(e.event_type, {
                    conversationId: p.conversationId,
                    userId: p.userId,
                    messageIds: p.messageIds,
                  });
              }
              await tx.chatInboxOutbox.update({
                where: { id: e.id },
                data: { processedAt: new Date(), attempts: { increment: 1 } },
              });
            } catch {
              await tx.chatInboxOutbox.update({
                where: { id: e.id },
                data: {
                  attempts: { increment: 1 },
                  nextAttemptAt: new Date(
                    Date.now() + Math.min(60000, 5000 * 2 ** Math.min(e.attempts, 4))
                  ),
                },
              });
            }
            return true;
          },
          { timeout: 12000, maxWait: 10000 }
        );
        if (!found) break;
      }
      if (!notification && ++ticks % 100 === 0)
        await db.chatInboxOutbox.deleteMany({
          where: { processedAt: { lt: new Date(Date.now() - 30 * 86400000) } },
        });
    } catch {
      /* Persisted work survives database unavailability and process restarts. */
    } finally {
      if (notification) notificationRunning = false;
      else chatRunning = false;
    }
  }
  const chatTimer = setInterval(() => void drain(false), 750),
    notifyTimer = setInterval(() => void drain(true), 1000);
  chatTimer.unref();
  notifyTimer.unref();
  void drain(false);
  return () => {
    stopped = true;
    clearInterval(chatTimer);
    clearInterval(notifyTimer);
  };
}
