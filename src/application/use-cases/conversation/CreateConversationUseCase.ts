import { injectable, inject } from 'tsyringe';
import { Conversation } from '@domain/entities';
import { IConversationRepository, IMatchRepository, IBlockRepository } from '@domain/repositories';
import { ConversationResponseDTO } from '@application/dto';
import { ConversationMapper } from '@application/mappers/ConversationMapper';
import {
  IConversationRepository as ConversationRepoToken,
  IMatchRepository as MatchRepoToken,
  IBlockRepository as BlockRepoToken,
} from '@shared/container/tokens';

interface CreateConversationInput {
  userAId: string;
  userBId: string;
  matchId?: string;
}

/**
 * Error thrown when users don't have a valid match
 */
export class UsersNotMatchedError extends Error {
  constructor() {
    super('Cannot create conversation: users do not have a valid match');
    this.name = 'UsersNotMatchedError';
  }
}

/**
 * Error thrown when users are blocked
 */
export class UsersBlockedError extends Error {
  constructor() {
    super('Cannot create conversation: users are blocked');
    this.name = 'UsersBlockedError';
  }
}

@injectable()
export class CreateConversationUseCase {
  constructor(
    @inject(ConversationRepoToken)
    private readonly conversationRepository: IConversationRepository,
    @inject(MatchRepoToken)
    private readonly matchRepository: IMatchRepository,
    @inject(BlockRepoToken)
    private readonly blockRepository: IBlockRepository
  ) {}

  async execute(input: CreateConversationInput): Promise<ConversationResponseDTO> {
    const { userAId, userBId, matchId } = input;

    // Validate: Check if users are blocked
    const isBlocked = await this.blockRepository.existsBetween(userAId, userBId);
    if (isBlocked) {
      throw new UsersBlockedError();
    }

    // Check if conversation already exists
    const existing = await this.conversationRepository.findByParticipants(userAId, userBId);
    if (existing) {
      return ConversationMapper.toResponseDTOAsync(existing, userAId);
    }

    // Validate: Check if users have a match
    const hasMatch = await this.matchRepository.existsBetween(userAId, userBId);
    if (!hasMatch) {
      throw new UsersNotMatchedError();
    }

    // Create new conversation
    const conversation = Conversation.create(userAId, userBId, matchId);

    // Save
    await this.conversationRepository.save(conversation);

    return ConversationMapper.toResponseDTOAsync(conversation, userAId);
  }
}
