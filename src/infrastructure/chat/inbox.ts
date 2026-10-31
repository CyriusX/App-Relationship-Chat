import { ChatInboxUseCases } from '@application/chat/ChatInboxUseCases';
import { PrismaChatInboxRepository } from './PrismaChatInboxRepository';
export const chatInbox = new ChatInboxUseCases(new PrismaChatInboxRepository());
