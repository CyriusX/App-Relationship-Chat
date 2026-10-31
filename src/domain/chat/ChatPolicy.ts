/** Stable semantic identity, independent of transport and later edits/deletion. */
export function commandIdentity(input: {
  content: string;
  type?: string;
  replyToId?: string;
  mediaUrl?: string;
}) {
  return JSON.stringify([
    input.content,
    input.type ?? 'TEXT',
    input.replyToId ?? null,
    input.mediaUrl ?? null,
  ]);
}
export function canParticipate(userId: string, pair: { userAId: string; userBId: string }) {
  return pair.userAId === userId || pair.userBId === userId;
}
export function publicAge(
  birth: Date | null,
  showAge: boolean,
  available: boolean,
  now = new Date()
): number | null {
  if (!birth || !showAge || !available) return null;
  return (
    now.getUTCFullYear() -
    birth.getUTCFullYear() -
    Number(
      now.getUTCMonth() < birth.getUTCMonth() ||
        (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())
    )
  );
}
