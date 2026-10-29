import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import 'reflect-metadata';
import { AuthorizeConversationUseCase } from '@application/use-cases/conversation/AuthorizeConversationUseCase';
import type { IConversationRepository, IBlockRepository } from '@domain/repositories';
import { Conversation } from '@domain/entities';
describe('Conversation authorization used by socket events', () => {
  const a = '11111111-1111-4111-8111-111111111111';
  const b = '22222222-2222-4222-8222-222222222222';
  const conversation = Conversation.create(a, b);
  const conversations = { findById: vi.fn() } as unknown as Mocked<IConversationRepository>;
  const blocks: Mocked<IBlockRepository> = { existsBetween: vi.fn() };
  const authorize = new AuthorizeConversationUseCase(conversations, blocks);
  beforeEach(() => {
    vi.clearAllMocks();
    conversations.findById.mockResolvedValue(conversation);
    blocks.existsBetween.mockResolvedValue(false);
  });
  it('permits a participant when no block exists', async () => {
    await expect(authorize.execute(a, conversation.id.value)).resolves.toBeUndefined();
    expect(blocks.existsBetween).toHaveBeenCalledWith(a, b);
  });
  it('denies a non participant before checking or leaking another account', async () => {
    await expect(
      authorize.execute('33333333-3333-4333-8333-333333333333', conversation.id.value)
    ).rejects.toThrow('Conversation unavailable');
    expect(blocks.existsBetween).not.toHaveBeenCalled();
  });
  it('denies a blocked pair', async () => {
    blocks.existsBetween.mockResolvedValue(true);
    await expect(authorize.execute(b, conversation.id.value)).rejects.toThrow('Users are blocked');
  });
  it('does not allow interactions if the block check is unavailable', async () => {
    blocks.existsBetween.mockRejectedValue(new Error('database unavailable'));
    await expect(authorize.execute(a, conversation.id.value)).rejects.toThrow(
      'database unavailable'
    );
  });
});
