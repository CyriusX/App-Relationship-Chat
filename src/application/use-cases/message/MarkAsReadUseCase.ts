import { injectable } from 'tsyringe';
import { ConversationId, MessageId } from '@domain/value-objects';
import { IConversationRepository, IMessageRepository } from '@domain/repositories';
import { ConversationNotFoundError, MessageNotFoundError } from '@domain/errors';
import { MessageResponseDTO } from '@application/dto';
import { MessageMapper } from '@application/mappers';

interface MarkAsReadInput {
  conversationId: string;
  userId: string;
  messageId?: string;
}

@injectable()
export class MarkAsReadUseCase {
  constructor(
    private readonly conversationRepository: IConversationRepository,
    private readonly messageRepository: IMessageRepository
  ) {}

  async execute(input: MarkAsReadInput): Promise<void> {
    const { conversationId, userId, messageId } = input;
    const convId = ConversationId.create(conversationId);

    // Find conversation
    const conversation = await this.conversationRepository.findById(convId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    // Verify user is participant
    if (!conversation.hasParticipant(userId)) {
      throw new Error('User is not a participant in this conversation');
    }

    // Mark messages as read
    if (messageId) {
      // Mark specific message as read
      const msgId = MessageId.create(messageId);
      const message = await this.messageRepository.findById(msgId);
      if (message) {
        message.markAsRead();
        await this.messageRepository.save(message);
      }
    } else {
      // Mark all messages in conversation as read for this user
      conversation.markAllAsRead(userId);
      await this.conversationRepository.save(conversation);
    }
  }
}
