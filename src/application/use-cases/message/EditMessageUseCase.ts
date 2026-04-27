import { injectable } from 'tsyringe';
import { MessageId, ConversationId } from '@domain/value-objects';
import { IConversationRepository, IMessageRepository } from '@domain/repositories';
import { ConversationNotFoundError, MessageNotFoundError } from '@domain/errors';
import { MessageResponseDTO } from '@application/dto';
import { MessageMapper } from '@application/mappers';

interface EditMessageInput {
  messageId: string;
  conversationId: string;
  userId: string;
  content: string;
}

@injectable()
export class EditMessageUseCase {
  constructor(
    private readonly conversationRepository: IConversationRepository,
    private readonly messageRepository: IMessageRepository
  ) {}

  async execute(input: EditMessageInput): Promise<MessageResponseDTO> {
    const { messageId, conversationId, userId, content } = input;
    const convId = ConversationId.create(conversationId);
    const msgId = MessageId.create(messageId);

    // Find conversation
    const conversation = await this.conversationRepository.findById(convId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    // Find message
    const message = await this.messageRepository.findById(msgId);
    if (!message) {
      throw new MessageNotFoundError(messageId);
    }

    // Verify user is sender
    if (message.senderId !== userId) {
      throw new Error('Only the sender can edit their own message');
    }

    // Edit message
    message.edit(content);

    // Save
    await this.messageRepository.save(message);

    return MessageMapper.toResponseDTO(message);
  }
}
