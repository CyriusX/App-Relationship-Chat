import { describe, it, expect } from 'vitest';
import { publicAge, commandIdentity, canParticipate } from '../../../src/domain/chat/ChatPolicy';
describe('Chat policy', () => {
  it('calcula o aniversário no mês correto e respeita privacidade', () => {
    const birth = new Date('2000-10-31');
    expect(publicAge(birth, true, true, new Date('2026-10-30'))).toBe(25);
    expect(publicAge(birth, true, true, new Date('2026-10-31'))).toBe(26);
    expect(publicAge(birth, false, true)).toBeNull();
    expect(publicAge(birth, true, false)).toBeNull();
  });
  it('normaliza somente valores opcionais, preservando a semântica do comando', () => {
    expect(commandIdentity({ content: 'Oi' })).toBe(
      commandIdentity({ content: 'Oi', type: 'TEXT' })
    );
    expect(commandIdentity({ content: 'Oi' })).not.toBe(commandIdentity({ content: 'Oi ' }));
    expect(commandIdentity({ content: 'Oi' })).not.toBe(
      commandIdentity({ content: 'Oi', replyToId: 'other' })
    );
  });
  it('restringe a conversa aos dois participantes', () => {
    expect(canParticipate('a', { userAId: 'a', userBId: 'b' })).toBe(true);
    expect(canParticipate('c', { userAId: 'a', userBId: 'b' })).toBe(false);
  });
});
