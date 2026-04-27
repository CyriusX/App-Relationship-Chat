import { z } from 'zod';

export const CreateMessageSchema = z.object({
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO']).default('TEXT'),
  replyToId: z.string().uuid().optional(),
  mediaUrl: z.string().url().optional(),
});

export const UpdateMessageSchema = z.object({
  messageId: z.string().uuid(),
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

export const MarkAsReadSchema = z.object({
  messageId: z.string().uuid(),
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const DeleteMessageSchema = z.object({
  messageId: z.string().uuid(),
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const GetMessageHistorySchema = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(50),
  before: z.string().datetime().optional(),
});
