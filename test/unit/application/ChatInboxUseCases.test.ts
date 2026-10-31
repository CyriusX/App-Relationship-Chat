import { it, expect, vi } from 'vitest';
import { ChatInboxUseCases } from '../../../src/application/chat/ChatInboxUseCases';
import type { IChatInboxRepository } from '../../../src/domain/chat/IChatInboxRepository';
const actor = '11111111-1111-4111-8111-111111111111',
  peer = '22222222-2222-4222-8222-222222222222',
  conversation = '33333333-3333-4333-8333-333333333333',
  command = '44444444-4444-4444-8444-444444444444';
function fixture() {
  const methods = {
    open: vi.fn(),
    send: vi.fn(),
    read: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    summary: vi.fn(),
    history: vi.fn(),
    change: vi.fn(),
  };
  return { repo: methods, uc: new ChatInboxUseCases(methods as IChatInboxRepository) };
}
it('rejects forged conversation participants before accessing persistence', () => {
  const { uc, repo } = fixture();
  expect(() => uc.open(actor, { userAId: peer, userBId: conversation })).toThrow();
  expect(repo.open).not.toHaveBeenCalled();
});
it('opens from the authenticated actor regardless of participant order', () => {
  const { uc, repo } = fixture();
  uc.open(actor, { userAId: peer, userBId: actor });
  expect(repo.open).toHaveBeenCalledWith(actor, peer, undefined);
});
it('preserves a retry identity and semantic whitespace for both transports', () => {
  const { uc, repo } = fixture();
  uc.send(actor, conversation, { content: ' Oi ', clientMessageId: command });
  expect(repo.send).toHaveBeenCalledWith(actor, {
    conversationId: conversation,
    content: ' Oi ',
    clientMessageId: command,
    type: 'TEXT',
  });
});
it('rejects empty or oversized messages before persistence', () => {
  const { uc, repo } = fixture();
  for (const content of [' ', 'x'.repeat(5001)])
    expect(() => uc.send(actor, conversation, { content })).toThrow();
  expect(repo.send).not.toHaveBeenCalled();
});
it('passes a bounded read marker and rejects malformed markers', () => {
  const { uc, repo } = fixture();
  uc.read(actor, conversation, { lastReadMessageId: command });
  expect(repo.read).toHaveBeenCalledWith(actor, conversation, command);
  expect(() => uc.read(actor, conversation, { lastReadMessageId: 'invalid' })).toThrow();
});
it('validates paging and normalizes HTTP filters without dropping cursor', () => {
  const { uc, repo } = fixture();
  uc.list(actor, { limit: '7', unreadOnly: 'false', q: ' Maria ', cursor: 'cursor' });
  expect(repo.list).toHaveBeenCalledWith(actor, {
    limit: 7,
    unreadOnly: false,
    q: 'Maria',
    cursor: 'cursor',
  });
  expect(() => uc.list(actor, { limit: 1000 })).toThrow();
});
