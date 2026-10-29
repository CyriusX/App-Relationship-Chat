import { prismaClient as prisma } from '../database/client';
import { assertDeletionAuthorized } from './AccountAccess';
export async function purgeAccount(userId: string): Promise<void> {
  await assertDeletionAuthorized(userId);
  await prisma.$transaction(async (tx) => {
    await tx.messageReaction.deleteMany({ where: { userId } });
    await tx.messageReadReceipt.deleteMany({ where: { userId } });
    await tx.conversationReadReceipt.deleteMany({ where: { userId } });
    await tx.message.updateMany({
      where: { senderId: userId },
      data: { content: null, mediaUrl: null, mediaType: null, deletedAt: new Date() },
    });
  });
}
