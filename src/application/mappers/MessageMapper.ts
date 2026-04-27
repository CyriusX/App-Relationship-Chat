import { Message } from '@domain/entities';
import { MessageResponseDTO } from '@application/dto';

export class MessageMapper {
  /**
   * Convert Message entity to MessageResponseDTO
   */
  static toResponseDTO(message: Message): MessageResponseDTO {
    const json = message.toJSON();
    return {
      id: json.id,
      conversationId: json.conversationId,
      senderId: json.senderId,
      content: json.content,
      type: json.type as any,
      status: json.status as any,
      replyToId: json.replyToId,
      mediaUrl: json.mediaUrl,
      isEdited: json.editedAt !== null,
      editedAt: json.editedAt,
      isDeleted: json.deletedAt !== null,
      deletedAt: json.deletedAt,
      createdAt: json.createdAt,
    };
  }

  /**
   * Convert array of Message entities to array of MessageResponseDTO
   */
  static toResponseDTOList(messages: Message[]): MessageResponseDTO[] {
    return messages.map((m) => this.toResponseDTO(m));
  }
}
