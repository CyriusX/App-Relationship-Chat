import axios, { type AxiosInstance } from 'axios';
import { injectable } from 'tsyringe';
import { servicesConfig } from '@shared/config';
import { logger } from '@shared/logger';
import { generateId } from '@shared/utils';

export interface MessageSentPayload {
  conversationId: string;
  messageId: string;
  senderId: string;
  receiverId: string;
  preview: string; // Max 200 chars
}

export interface INotificationClient {
  sendMessageSentEvent(payload: MessageSentPayload): Promise<void>;
}

@injectable()
export class NotificationHttpClient implements INotificationClient {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: servicesConfig.notification.url,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': servicesConfig.notification.apiKey,
      },
    });
  }

  async sendMessageSentEvent(payload: MessageSentPayload): Promise<void> {
    try {
      const eventPayload = {
        eventId: generateId(),
        eventType: 'chat.message.sent',
        occurredAt: new Date().toISOString(),
        producer: 'chat-service',
        payload: {
          ...payload,
          preview: payload.preview.slice(0, 200),
        },
      };

      await this.client.post('/internal/events', eventPayload);

      logger.debug(
        {
          eventId: eventPayload.eventId,
          messageId: payload.messageId,
        },
        'Notification event sent'
      );
    } catch (error) {
      // Log but don't throw - notification is non-critical
      logger.error(
        {
          error: axios.isAxiosError(error) ? error.message : error,
          payload,
        },
        'Failed to send notification event'
      );
    }
  }
}
