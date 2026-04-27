// Re-export service interfaces from infrastructure
export {
  INotificationClient,
  MessageSentPayload,
} from '@infrastructure/http/NotificationHttpClient';

export {
  IMatchValidator,
} from '@infrastructure/http/MatchValidatorClient';
