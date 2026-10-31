export const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;
export class MessageActionError extends Error {
  constructor(readonly reason: 'UNAVAILABLE' | 'TYPE' | 'EXPIRED' | 'CONFLICT') {
    super(
      {
        UNAVAILABLE: 'Mensagem indisponível.',
        TYPE: 'Somente mensagens de texto podem ser editadas.',
        EXPIRED: 'O prazo de 15 minutos para editar esta mensagem terminou.',
        CONFLICT:
          'Esta mensagem foi alterada em outro dispositivo. Reabra a edição para usar a versão atual.',
      }[reason]
    );
    this.name = 'MessageActionError';
  }
}
export function messageEditDecision(
  message: {
    senderId: string;
    type: string;
    content: string | null;
    createdAt: Date;
    editedAt: Date | null;
    deletedAt: Date | null;
  },
  actorId: string,
  content: string,
  expectedEditedAt: string | null | undefined,
  now: Date
): 'edit' | 'unchanged' {
  if (message.senderId !== actorId || message.deletedAt)
    throw new MessageActionError('UNAVAILABLE');
  if (message.type !== 'TEXT') throw new MessageActionError('TYPE');
  // A retry of an already applied command must not move the timestamp or renew its window.
  if (message.content === content) return 'unchanged';
  if (
    expectedEditedAt !== undefined &&
    (message.editedAt?.toISOString() ?? null) !== expectedEditedAt
  )
    throw new MessageActionError('CONFLICT');
  const age = now.getTime() - message.createdAt.getTime();
  if (!Number.isFinite(age) || age < 0 || age > MESSAGE_EDIT_WINDOW_MS)
    throw new MessageActionError('EXPIRED');
  return 'edit';
}
