import { describe, it, expect, beforeEach } from 'vitest';
import { Message } from '@domain/entities';
import { ConversationId, MessageType } from '@domain/value-objects';

describe('Message Entity', () => {
  let conversationId: ConversationId;
  const senderId = 'user-1';
  const content = 'Hello, World!'; 

  beforeEach(() => {
    conversationId = ConversationId.generate();
  });

  describe('create', () => {
    it('should create a new message with default values', () => {
    const message = Message.create(conversationId, senderId, content);

      expect(message.conversationId.equals(conversationId)).toBe(true);
      expect(message.senderId).toBe(senderId);
      expect(message.content.value).toBe(content);
      expect(message.type.value).toBe('TEXT'); // TEXT is default type
      expect(message.status.value).toBe('SENT');
      expect(message.isEdited).toBe(false);
      expect(message.isDeleted).toBe(false);
    });

    it('should create a message with custom type', () => {
      const message = Message.create(conversationId, senderId, content, MessageType.image());
      expect(message.type.isMedia).toBe(true);
    });

    it('should generate unique IDs for each message', () => {
      const message1 = Message.create(conversationId, senderId, content);
      const message2 = Message.create(conversationId, senderId, content);
      expect(message1.id.equals(message2.id)).toBe(false);
    });
  });

  describe('restore', () => {
    it('should restore a message from persistence', () => {
      const id = crypto.randomUUID();
      const createdAt = new Date('2024-01-01T10:00:00Z');
      const editedAt = new Date('2024-01-01T11:00:00Z');

      const message = Message.restore(
        id,
        conversationId.value,
        senderId,
        content,
        'TEXT',
        'DELIVERED',
        createdAt,
        editedAt,
        null,
        null,
        null
      );

      expect(message.id.value).toBe(id);
      expect(message.conversationId.equals(conversationId)).toBe(true);
      expect(message.senderId).toBe(senderId);
      expect(message.status.value).toBe('DELIVERED');
      expect(message.isEdited).toBe(true);
    });
  });

  describe('edit', () => {
    it('should edit message content', () => {
      const message = Message.create(conversationId, senderId, content);
      message.edit('Updated content');

      expect(message.content.value).toBe('Updated content');
      expect(message.isEdited).toBe(true);
      expect(message.editedAt).not.toBeNull();
    });

    it('should throw when editing deleted message', () => {
      const message = Message.create(conversationId, senderId, content);
      message.delete();

      expect(() => message.edit('New content')).toThrow();
    });
  });

  describe('delete', () => {
    it('should soft delete message', () => {
      const message = Message.create(conversationId, senderId, content);
      message.delete();

      expect(message.isDeleted).toBe(true);
      expect(message.deletedAt).not.toBeNull();
    });

    it('should be idempotent', () => {
      const message = Message.create(conversationId, senderId, content);
      message.delete();
      message.delete();

      expect(message.isDeleted).toBe(true);
    });
  });

  describe('restore', () => {
    it('should restore deleted message', () => {
      const message = Message.create(conversationId, senderId, content);
      message.delete();
      message.restore();

      expect(message.isDeleted).toBe(false);
      expect(message.deletedAt).toBeNull();
    });
  });

  describe('markAsDelivered', () => {
    it('should update status to delivered', () => {
      const message = Message.create(conversationId, senderId, content);
      message.markAsDelivered();

      expect(message.status.value).toBe('DELIVERED');
    });
  });

  describe('markAsRead', () => {
    it('should update status to read', () => {
      const message = Message.create(conversationId, senderId, content);
      message.markAsRead();

      expect(message.status.value).toBe('READ');
    });
  });

  describe('toJSON', () => {
    it('should serialize message to JSON', () => {
      const message = Message.create(conversationId, senderId, content);
      const json = message.toJSON();

      expect(json.conversationId).toBe(conversationId.value);
      expect(json.senderId).toBe(senderId);
      expect(json.content).toBe(content);
      expect(json.type).toBe('TEXT');
      expect(json.status).toBe('SENT');
    });
  });
});
