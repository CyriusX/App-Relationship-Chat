import { MessageStatusEnum, MessageTypeEnum } from '@domain/value-objects';

/**
 * DTO for message response (API output)
 */
export interface MessageResponseDTO {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageTypeEnum;
  status: MessageStatusEnum;
  replyToId: string | null;
  mediaUrl: string | null;
  isEdited: boolean;
  editedAt: Date | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
}

/**
 * DTO for message list response with pagination
 */
export interface MessageListResponseDTO {
  messages: MessageResponseDTO[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

/**
 * Map Message entity to MessageResponseDTO
 */
export function toMessageResponseDTO(message: {
  id: { value: string };
  conversationId: { value: string };
  senderId: string;
  content: { value: string };
  type: { value: string };
  status: { value: string };
  replyToId: { value: string } | null;
  mediaUrl: string | null;
  isEdited: boolean;
  editedAt: Date | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
}): MessageResponseDTO {
  return {
    id: message.id.value,
    conversationId: message.conversationId.value,
    senderId: message.senderId,
    content: message.content.value,
    type: message.type.value as MessageTypeEnum,
    status: message.status.value as MessageStatusEnum,
    replyToId: message.replyToId?.value ?? null,
    mediaUrl: message.mediaUrl,
    isEdited: message.isEdited,
    editedAt: message.editedAt,
    isDeleted: message.isDeleted,
    deletedAt: message.deletedAt,
    createdAt: message.createdAt,
  };
}
