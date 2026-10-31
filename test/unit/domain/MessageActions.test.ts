import { describe, it, expect } from 'vitest';
import {
  messageEditDecision,
  MESSAGE_EDIT_WINDOW_MS,
} from '../../../src/domain/chat/MessageActions';
const now = new Date('2026-10-31T15:00:00Z');
const message = (age = 1000) => ({
  senderId: 'alice',
  type: 'TEXT',
  content: 'old',
  createdAt: new Date(+now - age),
  editedAt: null as Date | null,
  deletedAt: null as Date | null,
});
describe('Own message editing', () => {
  it.each([0, 1, MESSAGE_EDIT_WINDOW_MS - 1, MESSAGE_EDIT_WINDOW_MS])(
    'accepts original age %s',
    (age) => expect(messageEditDecision(message(age), 'alice', 'new', null, now)).toBe('edit')
  );
  it('rejects after the deadline even if recently edited', () =>
    expect(() =>
      messageEditDecision(
        { ...message(MESSAGE_EDIT_WINDOW_MS + 1), editedAt: new Date(+now - 1) },
        'alice',
        'new',
        undefined,
        now
      )
    ).toThrow('15 minutos'));
  it('cannot edit another sender', () =>
    expect(() => messageEditDecision(message(), 'bob', 'new', null, now)).toThrow('indisponível'));
  it('cannot restore a deleted message', () =>
    expect(() =>
      messageEditDecision({ ...message(), deletedAt: now }, 'alice', 'new', null, now)
    ).toThrow('indisponível'));
  it('edits only text', () =>
    expect(() =>
      messageEditDecision({ ...message(), type: 'IMAGE' }, 'alice', 'new', null, now)
    ).toThrow('texto'));
  it('detects concurrent changes', () =>
    expect(() =>
      messageEditDecision({ ...message(), editedAt: now }, 'alice', 'new', null, now)
    ).toThrow('outro dispositivo'));
  it('accepts the current version', () =>
    expect(
      messageEditDecision({ ...message(), editedAt: now }, 'alice', 'new', now.toISOString(), now)
    ).toBe('edit'));
  it('replays identical content without a second edit, even after expiry', () =>
    expect(
      messageEditDecision(
        { ...message(MESSAGE_EDIT_WINDOW_MS + 1), content: 'new', editedAt: now },
        'alice',
        'new',
        null,
        now
      )
    ).toBe('unchanged'));
  it('does not accept a future timestamp', () =>
    expect(() => messageEditDecision(message(-1), 'alice', 'new', null, now)).toThrow(
      '15 minutos'
    ));
});
