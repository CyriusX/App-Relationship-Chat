import { z } from 'zod';

export const UpdatePresenceSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['ONLINE', 'OFFLINE', 'AWAY']),
});

export const TypingIndicatorSchema = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  isTyping: z.boolean(),
});

export const GetOnlineUsersSchema = z.object({
  // No parameters needed, but could add filtering options later
  limit: z.number().int().min(1).max(1000).optional(),
});
