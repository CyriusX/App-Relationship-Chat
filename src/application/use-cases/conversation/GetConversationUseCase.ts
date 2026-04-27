import { injectable } from 'tsyringe';
import { ConversationId } from '@domain/value-objects';
import { IConversationRepository } from '@domain/repositories';
import { ConversationNotFoundError } from '@domain/errors';
import { ConversationResponseDTO } from '@application/dto';
import { ConversationMapper } from '@application/mappers';

interface GetConversationInput {
  conversationId: string;
  userId: string;
}

@injectable()
export class GetConversationUseCase {
  constructor(
    private readonly conversationRepository: IConversationRepository
  ) {}

  async execute(input: GetConversationInput): Promise<ConversationResponseDTO> {
    const { conversationId, userId } = input;
    const id = ConversationId.create(conversationId);

    const conversation = await this.conversationRepository.findById(id);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    // Verify user is participant
    if (!conversation.hasParticipant(userId)) {
      throw new Error('User is not a participant in this conversation');
    }

    return ConversationMapper.toResponseDTOAsync(conversation, userId);
  }
}
