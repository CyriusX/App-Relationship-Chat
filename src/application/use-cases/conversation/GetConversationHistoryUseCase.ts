import { injectable } from 'tsyringe';
import { ConversationId } from '@domain/value-objects';
import { IConversationRepository } from '@domain/repositories';
import { ConversationNotFoundError } from '@domain/errors';
import { MessageListResponseDTO } from '@application/dto';
import { MessageMapper } from '@application/mappers';

interface GetConversationHistoryInput {
  conversationId: string;
  userId: string;
  limit?: number;
  before?: Date;
}

@injectable()
export class GetConversationHistoryUseCase {
  constructor(
    private readonly conversationRepository: IConversationRepository
  ) {}

  async execute(input: GetConversationHistoryInput): Promise<MessageListResponseDTO> {
    const { conversationId, userId, limit = 50, before } = input;
    const id = ConversationId.create(conversationId);

    const conversation = await this.conversationRepository.findById(id);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    // Verify user is participant
    if (!conversation.hasParticipant(userId)) {
      throw new Error('User is not a participant in this conversation');
    }

    // Get messages
    const messages = conversation.getMessages(limit ?? 50, before);

    return {
      messages: messages.map((m) => MessageMapper.toResponseDTO(m)),
      total: messages.length,
      hasMore: messages.length === (limit ?? 50),
      nextCursor: messages.length > 0 ? messages[messages.length - 1].id.value : null,
    };
  }
}
