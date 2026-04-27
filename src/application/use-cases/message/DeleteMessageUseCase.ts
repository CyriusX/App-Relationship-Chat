import { injectable } from 'tsyringe';
import { MessageId, ConversationId } from '@domain/value-objects';
import { IConversationRepository, IMessageRepository } from '@domain/repositories';
import { ConversationNotFoundError, MessageNotFoundError } from '@domain/errors';

interface DeleteMessageInput {
  messageId: string;
  conversationId: string;
  userId: string;
}

@injectable()
export class DeleteMessageUseCase {
  constructor(
    private readonly conversationRepository: IConversationRepository,
    private readonly messageRepository: IMessageRepository
  ) {}

  async execute(input: DeleteMessageInput): Promise<void> {
    const { messageId, conversationId, userId } = input;
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
      throw new Error('Only the sender can delete their own message');
    }

    // Soft delete message
    message.delete();

    // Save
    await this.messageRepository.save(message);
  }
}
