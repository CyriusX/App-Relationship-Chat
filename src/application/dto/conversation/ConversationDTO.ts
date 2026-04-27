/**
 * DTO for creating a new conversation
 */
export interface CreateConversationDTO {
  userAId: string;
  userBId: string;
  matchId?: string;
}

/**
 * DTO for other user info in conversation
 */
export interface ConversationOtherUserDTO {
  id: string;
  displayName: string;
  age: number;
  photoUrl: string | null;
}

/**
 * DTO for conversation response (API output)
 */
export interface ConversationResponseDTO {
  id: string;
  userAId: string;
  userBId: string;
  matchId: string | null;
  otherUser: ConversationOtherUserDTO;
  lastMessage: ConversationLastMessageDTO | null;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}

/**
 * DTO for last message preview in conversation list
 */
export interface ConversationLastMessageDTO {
  id: string;
  senderId: string;
  preview: string;
  createdAt: Date;
}

/**
 * DTO for conversation list response with pagination
 */
export interface ConversationListResponseDTO {
  conversations: ConversationResponseDTO[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}
