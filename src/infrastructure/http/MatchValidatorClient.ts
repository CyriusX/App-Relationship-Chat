import axios, { type AxiosInstance } from 'axios';
import { injectable } from 'tsyringe';
import { servicesConfig } from '@shared/config';
import { logger } from '@shared/logger';

export interface IMatchValidator {
  hasMatch(userAId: string, userBId: string): Promise<boolean>;
  isBlocked(userAId: string, userBId: string): Promise<boolean>;
}

@injectable()
export class MatchValidatorClient implements IMatchValidator {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: servicesConfig.core.url,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': servicesConfig.core.apiKey,
      },
    });
  }

  async hasMatch(userAId: string, userBId: string): Promise<boolean> {
    try {
      const response = await this.client.get(`/internal/matches/check`, {
        params: { userAId, userBId },
      });

      return response.data.hasMatch === true;
    } catch (error) {
      logger.error(
        {
          error: axios.isAxiosError(error) ? error.message : error,
          userAId,
          userBId,
        },
        'Failed to check match status'
      );

      // Fail closed - if we can't verify match, don't allow chat
      return false;
    }
  }

  async isBlocked(userAId: string, userBId: string): Promise<boolean> {
    try {
      const response = await this.client.get(`/internal/blocks/check`, {
        params: { userAId, userBId },
      });

      return response.data.isBlocked === true;
    } catch (error) {
      logger.error(
        {
          error: axios.isAxiosError(error) ? error.message : error,
          userAId,
          userBId,
        },
        'Failed to check block status'
      );

      // Fail open for blocks - if we can't verify, assume not blocked
      // This is safer than blocking legitimate conversations
      return false;
    }
  }
}
