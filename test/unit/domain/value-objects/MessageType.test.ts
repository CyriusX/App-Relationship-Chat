import { describe, it, expect } from 'vitest';
import { MessageType, MessageTypeEnum } from '@domain/value-objects';

describe('MessageType', () => {
  describe('factory methods', () => {
    it('should create TEXT type', () => {
      const type = MessageType.text();
      expect(type.value).toBe(MessageTypeEnum.TEXT);
      expect(type.isText).toBe(true);
      expect(type.isMedia).toBe(false);
    });

    it('should create IMAGE type', () => {
      const type = MessageType.image();
      expect(type.value).toBe(MessageTypeEnum.IMAGE);
      expect(type.isMedia).toBe(true);
    });

    it('should create VIDEO type', () => {
      const type = MessageType.video();
      expect(type.value).toBe(MessageTypeEnum.VIDEO);
      expect(type.isMedia).toBe(true);
    });

    it('should create AUDIO type', () => {
      const type = MessageType.audio();
      expect(type.value).toBe(MessageTypeEnum.AUDIO);
      expect(type.isMedia).toBe(true);
    });

    it('should create SYSTEM type', () => {
      const type = MessageType.system();
      expect(type.value).toBe(MessageTypeEnum.SYSTEM);
      expect(type.isSystem).toBe(true);
    });
  });

  describe('fromString', () => {
    it('should create type from string', () => {
      expect(MessageType.fromString('TEXT').value).toBe(MessageTypeEnum.TEXT);
      expect(MessageType.fromString('IMAGE').value).toBe(MessageTypeEnum.IMAGE);
    });

    it('should throw for invalid type', () => {
      expect(() => MessageType.fromString('INVALID')).toThrow();
    });
  });
});
