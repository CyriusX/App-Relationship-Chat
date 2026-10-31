import axios, { type AxiosInstance } from 'axios';
import { injectable } from 'tsyringe';
import { servicesConfig } from '@shared/config';
import { logger } from '@shared/logger';

export interface MessageSentPayload {
  conversationId: string;
  messageId: string;
  senderId: string;
  receiverId: string;
  preview: string; // Max 200 chars
  occurredAt?: string;
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
        eventId: payload.messageId,
        eventType: 'chat.message.sent',
        occurredAt: payload.occurredAt ?? new Date().toISOString(),
        producer: 'chat-service',
        payload: {
          conversationId: payload.conversationId,
          messageId: payload.messageId,
          senderId: payload.senderId,
          receiverId: payload.receiverId,
          preview: payload.preview.slice(0, 200),
        },
      };

      const response = await this.client.post<{ data?: { processed?: boolean } }>(
        '/internal/events',
        eventPayload
      );
      if (response.data.data?.processed !== true)
        throw new Error('Notification processing not confirmed');

      logger.debug(
        {
          eventId: eventPayload.eventId,
          messageId: payload.messageId,
        },
        'Notification event sent'
      );
    } catch (error) {
      logger.warn(
        {
          messageId: payload.messageId,
          code: axios.isAxiosError(error) ? error.code : 'DELIVERY_FAILED',
        },
        'Notification delivery will be retried'
      );
      throw new Error('Notification delivery failed');
    }
  }
}
