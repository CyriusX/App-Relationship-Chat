import { injectable } from 'tsyringe';
import { ConversationId } from '@domain/value-objects';
import { IConversationRepository, IMessageRepository } from '@domain/repositories';
import { ConversationNotFoundError } from '@domain/errors';
import { MessageListResponseDTO } from '@application/dto';
import { MessageMapper } from '@application/mappers';

interface GetMessageHistoryInput {
  conversationId: string;
  userId: string;
  limit?: number;
  before?: Date;
}

@injectable()
export class GetMessageHistoryUseCase {
  constructor(
    private readonly conversationRepository: IConversationRepository,
    private readonly messageRepository: IMessageRepository
  ) {}

  async execute(input: GetMessageHistoryInput): Promise<MessageListResponseDTO> {
    const { conversationId, userId, limit = 50, before } = input;
    const id = ConversationId.create(conversationId);

    // Find conversation
    const conversation = await this.conversationRepository.findById(id);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    // Verify user is participant
    if (!conversation.hasParticipant(userId)) {
      throw new Error('User is not a participant in this conversation');
    }

    // Get messages from repository
    const messages = await this.messageRepository.findByConversationId(id, limit, before);

    // Calculate pagination info
    const hasMore = messages.length === limit;
    const nextCursor = messages.length > 0 ? messages[messages.length - 1].id.value : null;

    return {
      messages: messages.map((m) => MessageMapper.toResponseDTO(m)),
      total: messages.length,
      hasMore,
      nextCursor,
    };
  }
}
