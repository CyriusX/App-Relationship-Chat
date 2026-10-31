import 'reflect-metadata';
import { it, expect, vi, beforeEach } from 'vitest';
const post = vi.hoisted(() => vi.fn());
vi.mock('axios', () => ({ default: { create: () => ({ post }), isAxiosError: () => false } }));
import { NotificationHttpClient } from '../../../src/infrastructure/http/NotificationHttpClient';
const event = {
  conversationId: 'c',
  messageId: 'm',
  senderId: 'a',
  receiverId: 'b',
  preview: 'Oi',
  occurredAt: '2026-10-31T00:00:00.000Z',
};
beforeEach(() => post.mockReset());
it('does not discard durable work merely because HTTP accepted an unprocessed event', async () => {
  post.mockResolvedValue({ data: { success: true, data: { processed: false } } });
  await expect(new NotificationHttpClient().sendMessageSentEvent(event)).rejects.toThrow(
    'Notification delivery failed'
  );
});
it('confirms processing and preserves event identity and original time across retries', async () => {
  post.mockResolvedValue({ data: { data: { processed: true } } });
  const client = new NotificationHttpClient();
  await client.sendMessageSentEvent(event);
  await client.sendMessageSentEvent(event);
  expect(post.mock.calls[0]).toEqual(post.mock.calls[1]);
  expect(post.mock.calls[0][1]).toMatchObject({ eventId: 'm', occurredAt: event.occurredAt });
});
