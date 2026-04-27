import { describe, it, expect } from 'vitest';
import { MessageStatus, MessageStatusEnum } from '@domain/value-objects';

describe('MessageStatus', () => {
  describe('factory methods', () => {
    it('should create SENT status', () => {
      const status = MessageStatus.sent();
      expect(status.value).toBe(MessageStatusEnum.SENT);
      expect(status.isSent).toBe(true);
    });

    it('should create DELIVERED status', () => {
      const status = MessageStatus.delivered();
      expect(status.value).toBe(MessageStatusEnum.DELIVERED);
      expect(status.isDelivered).toBe(true);
    });

    it('should create READ status', () => {
      const status = MessageStatus.read();
      expect(status.value).toBe(MessageStatusEnum.READ);
      expect(status.isRead).toBe(true);
    });
  });

  describe('fromString', () => {
    it('should create status from string', () => {
      expect(MessageStatus.fromString('SENT').value).toBe(MessageStatusEnum.SENT);
      expect(MessageStatus.fromString('DELIVERED').value).toBe(MessageStatusEnum.DELIVERED);
      expect(MessageStatus.fromString('READ').value).toBe(MessageStatusEnum.READ);
    });

    it('should throw for invalid status', () => {
      expect(() => MessageStatus.fromString('INVALID')).toThrow();
    });
  });

  describe('canTransitionTo', () => {
    it('should allow SENT -> DELIVERED', () => {
      const sent = MessageStatus.sent();
      const delivered = MessageStatus.delivered();
      expect(sent.canTransitionTo(delivered)).toBe(true);
    });

    it('should allow SENT -> READ', () => {
      const sent = MessageStatus.sent();
      const read = MessageStatus.read();
      expect(sent.canTransitionTo(read)).toBe(true);
    });

    it('should allow DELIVERED -> READ', () => {
      const delivered = MessageStatus.delivered();
      const read = MessageStatus.read();
      expect(delivered.canTransitionTo(read)).toBe(true);
    });

    it('should not allow READ -> SENT', () => {
      const read = MessageStatus.read();
      const sent = MessageStatus.sent();
      expect(read.canTransitionTo(sent)).toBe(false);
    });

    it('should not allow READ -> DELIVERED', () => {
      const read = MessageStatus.read();
      const delivered = MessageStatus.delivered();
      expect(read.canTransitionTo(delivered)).toBe(false);
    });
  });
});
