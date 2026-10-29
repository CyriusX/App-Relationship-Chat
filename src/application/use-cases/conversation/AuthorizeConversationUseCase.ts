import { inject, injectable } from 'tsyringe';
import type { IConversationRepository, IBlockRepository } from '@domain/repositories';
import { ConversationId } from '@domain/value-objects';
import {
  IConversationRepository as ConversationToken,
  IBlockRepository as BlockToken,
} from '@shared/container/tokens';
export class ConversationAccessError extends Error {
  readonly statusCode = 403;
}
@injectable()
export class AuthorizeConversationUseCase {
  constructor(
    @inject(ConversationToken) private readonly conversations: IConversationRepository,
    @inject(BlockToken) private readonly blocks: IBlockRepository
  ) {}
  async execute(userId: string, conversationId: string): Promise<void> {
    const conversation = await this.conversations.findById(ConversationId.restore(conversationId));
    if (!conversation?.hasParticipant(userId))
      throw new ConversationAccessError('Conversation unavailable');
    if (await this.blocks.existsBetween(userId, conversation.getOtherParticipant(userId)))
      throw new ConversationAccessError('Users are blocked');
  }
}
