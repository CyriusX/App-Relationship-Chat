/**
 * DTO for updating user presence
 */
export interface UpdatePresenceDTO {
  userId: string;
  status: 'ONLINE' | 'OFFLINE' | 'AWAY';
}

/**
 * DTO for user presence response
 */
export interface PresenceResponseDTO {
  userId: string;
  status: 'ONLINE' | 'OFFLINE' | 'AWAY';
  lastSeen: Date | null;
  socketIds: string[];
}

/**
 * DTO for typing indicator
 */
export interface TypingIndicatorDTO {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

/**
 * DTO for online users response
 */
export interface OnlineUsersResponseDTO {
  users: string[];
  count: number;
}
