import { describe, it, expect, beforeEach } from 'vitest';
import { Conversation, Message } from '@domain/entities';
import { ConversationId, MessageId } from '@domain/value-objects';

describe('Conversation Entity', () => {
  const userAId = 'user-1';
  const userBId = 'user-2';
  const matchId = 'match-1';

  describe('create', () => {
    it('should create a new conversation', () => {
      const conversation = Conversation.create(userAId, userBId);

      expect(conversation.userAId).toBe(userAId);
      expect(conversation.userBId).toBe(userBId);
      expect(conversation.matchId).toBeNull();
      expect(conversation.messages).toHaveLength(0);
    });

    it('should create a conversation with match ID', () => {
      const conversation = Conversation.create(userAId, userBId, matchId);
      expect(conversation.matchId).toBe(matchId);
    });

    it('should generate unique IDs for each conversation', () => {
      const conv1 = Conversation.create(userAId, userBId);
      const conv2 = Conversation.create(userAId, userBId);
      expect(conv1.id.equals(conv2.id)).toBe(false);
    });
  });

  describe('restore', () => {
    it('should restore a conversation from persistence', () => {
      const id = crypto.randomUUID();
      const createdAt = new Date('2024-01-01T10:00:00Z');
      const updatedAt = new Date('2024-01-02T10:00:00Z');
      const lastMessageAt = new Date('2024-01-02T09:00:00Z');

      const conversation = Conversation.restore(
        id,
        userAId,
        userBId,
        matchId,
        [],
        createdAt,
        updatedAt,
        lastMessageAt
      );

      expect(conversation.id.value).toBe(id);
      expect(conversation.matchId).toBe(matchId);
    });
  });

  describe('hasParticipant', () => {
    it('should return true for participants', () => {
      const conversation = Conversation.create(userAId, userBId);
      expect(conversation.hasParticipant(userAId)).toBe(true);
      expect(conversation.hasParticipant(userBId)).toBe(true);
    });

    it('should return false for non-participants', () => {
      const conversation = Conversation.create(userAId, userBId);
      expect(conversation.hasParticipant('user-3')).toBe(false);
    });
  });

  describe('getOtherParticipant', () => {
    it('should return the other participant', () => {
      const conversation = Conversation.create(userAId, userBId);
      expect(conversation.getOtherParticipant(userAId)).toBe(userBId);
      expect(conversation.getOtherParticipant(userBId)).toBe(userAId);
    });

    it('should throw for non-participant', () => {
      const conversation = Conversation.create(userAId, userBId);
      expect(() => conversation.getOtherParticipant('user-3')).toThrow();
    });
  });

  describe('addMessage', () => {
    let conversation: Conversation;

    beforeEach(() => {
      conversation = Conversation.create(userAId, userBId);
    });

    it('should add a message to the conversation', () => {
      const message = Message.create(conversation.id, userAId, 'Hello!');
      conversation.addMessage(message);

      expect(conversation.messages).toHaveLength(1);
    });
  });

  describe('findMessage', () => {
    it('should find a message by ID', () => {
      const conversation = Conversation.create(userAId, userBId);
      const message = Message.create(conversation.id, userAId, 'Hello!');
      conversation.addMessage(message);

      const found = conversation.findMessage(message.id);
      expect(found).not.toBeNull();
      expect(found?.id.equals(message.id)).toBe(true);
    });

    it('should return null for non-existent message', () => {
      const conversation = Conversation.create(userAId, userBId);
      const nonExistentId = MessageId.generate();

      expect(conversation.findMessage(nonExistentId)).toBeNull();
    });
  });

  describe('lastMessage', () => {
    it('should return the last non-deleted message', () => {
      const conversation = Conversation.create(userAId, userBId);
      const message1 = Message.create(conversation.id, userAId, 'First');
      const message2 = Message.create(conversation.id, userBId, 'Second');

      conversation.addMessage(message1);
      conversation.addMessage(message2);

      expect(conversation.lastMessage?.content.value).toBe('Second');
    });

    it('should return null if all messages are deleted', () => {
      const conversation = Conversation.create(userAId, userBId);
      const message = Message.create(conversation.id, userAId, 'Hello!');
      message.delete();
      conversation.addMessage(message);

      expect(conversation.lastMessage).toBeNull();
    });
  });

  describe('getUnreadCount', () => {
    it('should count unread messages for a user', () => {
      const conversation = Conversation.create(userAId, userBId);
      const message1 = Message.create(conversation.id, userBId, 'Hello!');
      const message2 = Message.create(conversation.id, userBId, 'World!');

      conversation.addMessage(message1);
      conversation.addMessage(message2);

      expect(conversation.getUnreadCount(userAId)).toBe(2);
    });

    it('should not count read messages', () => {
      const conversation = Conversation.create(userAId, userBId);
      const message = Message.create(conversation.id, userBId, 'Hello!');
      message.markAsRead();

      conversation.addMessage(message);

      expect(conversation.getUnreadCount(userAId)).toBe(0);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all messages from other participant as read', () => {
      const conversation = Conversation.create(userAId, userBId);
      const message1 = Message.create(conversation.id, userBId, 'Hello!');
      const message2 = Message.create(conversation.id, userBId, 'World!');

      conversation.addMessage(message1);
      conversation.addMessage(message2);

      conversation.markAllAsRead(userAId);

      expect(conversation.getUnreadCount(userAId)).toBe(0);
    });
  });
});
