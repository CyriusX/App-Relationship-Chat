import { Prisma } from '../database/generated';
/** Share CORE's participant locks, so a committed block cannot race a new send. */
export async function lockParticipants(tx: Prisma.TransactionClient, ids: string[]) {
  const ordered = [...new Set(ids)].sort();
  for (const id of ordered)
    await tx.$executeRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
      'interaction-' + id
    );
  await tx.$queryRaw`SELECT id FROM users WHERE id IN (${Prisma.join(ordered)}) ORDER BY id FOR SHARE`;
}
