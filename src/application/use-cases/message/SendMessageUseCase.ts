import { injectable, inject } from 'tsyringe';
import { ConversationId, MessageId, MessageType } from '@domain/value-objects';
import { Message, Conversation } from '@domain/entities';
import {
  IConversationRepository,
  IMessageRepository,
  IBlockRepository,
} from '@domain/repositories';
import { INotificationClient } from '@application/ports/services';
import { DomainEvent } from '@domain/events';
import { MessageSent } from '@domain/events/MessageSent';
import {
  IConversationRepository as ConversationRepoToken,
  IMessageRepository as MessageRepoToken,
  IBlockRepository as BlockRepoToken,
  INotificationClient as NotificationClientToken,
} from '@shared/container/tokens';

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  content: string;
  type?: string;
  replyToId?: string;
}

export interface SendMessageOutput {
  message: Message;
  event: DomainEvent;
}

/**
 * Error thrown when users are blocked
 */
export class UsersBlockedError extends Error {
  constructor() {
    super('Cannot send message: users are blocked');
    this.name = 'UsersBlockedError';
  }
}

@injectable()
export class SendMessageUseCase {
  constructor(
    @inject(ConversationRepoToken)
    private readonly conversationRepository: IConversationRepository,
    @inject(MessageRepoToken)
    private readonly messageRepository: IMessageRepository,
    @inject(BlockRepoToken)
    private readonly blockRepository: IBlockRepository,
    @inject(NotificationClientToken)
    private readonly notificationClient: INotificationClient
  ) {}

  async execute(input: SendMessageInput): Promise<SendMessageOutput> {
    const conversationId = ConversationId.create(input.conversationId);
    const senderId = input.senderId;

    // Get conversation
    const conversation = await this.conversationRepository.findById(conversationId);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Verify user is participant
    if (!conversation.hasParticipant(senderId)) {
      throw new Error('User is not a participant in this conversation');
    }

    // Get the other participant
    const recipientId = conversation.getOtherParticipant(senderId);

    // Validate: Check if users are blocked
    const isBlocked = await this.blockRepository.existsBetween(senderId, recipientId);
    if (isBlocked) {
      throw new UsersBlockedError();
    }

    // Create message
    const messageType = input.type ? MessageType.fromString(input.type) : MessageType.text();
    const message = Message.create(conversationId, senderId, input.content, messageType);

    // Set reply if provided
    if (input.replyToId) {
      message.setReplyTo(MessageId.create(input.replyToId));
    }

    // Add message to conversation
    conversation.addMessage(message);

    // Save to repository
    await this.messageRepository.save(message);

    // Create domain event
    const event = new MessageSent(message);

    // Notify via notification client (async)
    this.notificationClient
      .sendMessageSentEvent({
        conversationId: message.conversationId.value,
        messageId: message.id.value,
        senderId: message.senderId,
        receiverId: recipientId,
        preview: message.content.preview,
      })
      .catch((error) => {
        // Log but don't throw - notification is non-critical
        console.error('Failed to send notification event:', error);
      });

    return {
      message,
      event,
    };
  }
}
