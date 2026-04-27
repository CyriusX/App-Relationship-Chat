import { describe, it, expect } from 'vitest';
import { MessageContent } from '@domain/value-objects';

describe('MessageContent', () => {
  describe('create', () => {
    it('should create a valid message content', () => {
      const content = MessageContent.create('Hello, World!');
      expect(content.value).toBe('Hello, World!');
    });

    it('should trim whitespace', () => {
      const content = MessageContent.create('  Hello, World!  ');
      expect(content.value).toBe('Hello, World!');
    });

    it('should throw for empty content', () => {
      expect(() => MessageContent.create('')).toThrow();
    });

    it('should throw for whitespace-only content', () => {
      expect(() => MessageContent.create('   ')).toThrow();
    });

    it('should throw for content exceeding max length', () => {
      const longContent = 'a'.repeat(5001);
      expect(() => MessageContent.create(longContent)).toThrow();
    });

    it('should accept content at max length', () => {
      const maxContent = 'a'.repeat(5000);
      const content = MessageContent.create(maxContent);
      expect(content.value).toBe(maxContent);
    });
  });

  describe('preview', () => {
    it('should return full content if under 200 chars', () => {
      const content = MessageContent.create('Short message');
      expect(content.preview).toBe('Short message');
    });

    it('should truncate content over 200 chars', () => {
      const longContent = 'a'.repeat(300);
      const content = MessageContent.create(longContent);
      expect(content.preview.length).toBe(200);
    });
  });

  describe('equals', () => {
    it('should return true for equal contents', () => {
      const content1 = MessageContent.create('Hello');
      const content2 = MessageContent.create('Hello');
      expect(content1.equals(content2)).toBe(true);
    });

    it('should return false for different contents', () => {
      const content1 = MessageContent.create('Hello');
      const content2 = MessageContent.create('World');
      expect(content1.equals(content2)).toBe(false);
    });
  });
});
