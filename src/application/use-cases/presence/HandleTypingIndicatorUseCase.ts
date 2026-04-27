import { injectable } from 'tsyringe';
import { IPresenceRepository } from '@domain/repositories';

interface TypingIndicatorInput {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

@injectable()
export class HandleTypingIndicatorUseCase {
  constructor(
    private readonly presenceRepository: IPresenceRepository
  ) {}

  async execute(input: TypingIndicatorInput): Promise<void> {
    const { conversationId, userId, isTyping } = input;

    if (isTyping) {
      await this.presenceRepository.setTyping(conversationId, userId);
    } else {
      await this.presenceRepository.removeTyping(conversationId, userId);
    }
  }
}
