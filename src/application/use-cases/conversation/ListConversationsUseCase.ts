import { injectable } from 'tsyringe';
import { IConversationRepository } from '@domain/repositories';
import { ConversationListResponseDTO } from '@application/dto';
import { ConversationMapper } from '@application/mappers';

interface ListConversationsInput {
  userId: string;
  limit?: number;
  offset?: number;
}

@injectable()
export class ListConversationsUseCase {
  constructor(
    private readonly conversationRepository: IConversationRepository
  ) {}

  async execute(input: ListConversationsInput): Promise<ConversationListResponseDTO> {
    const { userId, limit = 20, offset = 0 } = input;

    const [conversations, total] = await Promise.all([
      this.conversationRepository.findByUserId(userId, limit + 1, offset),
      this.conversationRepository.countByUserId(userId),
    ]);

    const hasMore = conversations.length > limit;
    const items = hasMore ? conversations.slice(0, limit) : conversations;
    const nextCursor = hasMore && items.length > 0 ? String(offset + limit) : null;

    return ConversationMapper.toListResponseDTOAsync(items, userId, total, hasMore, nextCursor);
  }
}
