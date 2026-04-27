/**
 * DTO for creating a new message
 */
export interface CreateMessageDTO {
  conversationId: string;
  senderId: string;
  content: string;
  type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
  replyToId?: string;
  mediaUrl?: string;
}

/**
 * DTO for updating a message (edit content)
 */
export interface UpdateMessageDTO {
  messageId: string;
  conversationId: string;
  userId: string;
  content: string;
}

/**
 * DTO for marking message as read
 */
export interface MarkMessageAsReadDTO {
  messageId: string;
  conversationId: string;
  userId: string;
}
