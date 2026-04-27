import { injectable } from 'tsyringe';
import { IPresenceRepository } from '@domain/repositories';
import { PresenceStatus } from '@domain/value-objects';
import { UserPresenceChanged } from '@domain/events';

interface UpdatePresenceInput {
  userId: string;
  status: 'ONLINE' | 'OFFLINE' | 'AWAY';
}

@injectable()
export class UpdatePresenceUseCase {
  constructor(
    private readonly presenceRepository: IPresenceRepository
  ) {}

  async execute(input: UpdatePresenceInput): Promise<void> {
    const { userId, status } = input;

    const presenceStatus = status === 'ONLINE'
      ? PresenceStatus.online()
      : status === 'OFFLINE'
      ? PresenceStatus.offline()
      : PresenceStatus.away();

    // Update presence status
    await this.presenceRepository.updateStatus(userId, presenceStatus);

    // Update last seen timestamp
    await this.presenceRepository.updateLastSeen(userId);
  }
}
