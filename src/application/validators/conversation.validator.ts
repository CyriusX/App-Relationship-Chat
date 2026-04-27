import { z } from 'zod';

export const CreateConversationSchema = z.object({
  userAId: z.string().uuid(),
  userBId: z.string().uuid(),
  matchId: z.string().uuid().optional(),
});

export const GetConversationSchema = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const ListConversationsSchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
