import { Conversation } from '@domain/entities';
import {
  ConversationResponseDTO,
  ConversationListResponseDTO,
  ConversationOtherUserDTO,
} from '@application/dto';
import { prismaClient } from '@infrastructure/database/client';

export class ConversationMapper {
  /**
   * Convert Conversation entity to ConversationResponseDTO
   * Now includes other user data from database
   */
  static async toResponseDTOAsync(
    conversation: Conversation,
    userId: string
  ): Promise<ConversationResponseDTO> {
    const otherUserId =
      conversation.userAId === userId ? conversation.userBId : conversation.userAId;

    const account = await prismaClient.user.findUnique({
      where: { id: otherUserId },
      select: { status: true },
    });
    const available = account?.status === 'ACTIVE';
    // Fetch other user data from database
    const otherUserProfile = await prismaClient.profile.findUnique({
      where: { userId: otherUserId },
      select: {
        displayName: true,
        birthDate: true,
      },
    });

    // Fetch other user's main photo
    const otherUserPhoto = await prismaClient.media.findFirst({
      where: {
        userId: otherUserId,
        type: 'PHOTO',
        status: 'READY',
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        url: true,
      },
    });

    // Calculate age from birth date
    let age = 0;
    if (otherUserProfile?.birthDate) {
      const today = new Date();
      age = today.getFullYear() - otherUserProfile.birthDate.getFullYear();
      const monthDiff = today.getMonth() - otherUserProfile.birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 1 && today.getDate() < otherUserProfile.birthDate.getDate())
      ) {
        age--;
      }
    }

    const otherUser: ConversationOtherUserDTO = {
      id: otherUserId,
      displayName: available ? (otherUserProfile?.displayName ?? 'Usuário') : 'Usuário excluído',
      age: available ? age : 0,
      photoUrl: available ? (otherUserPhoto?.url ?? null) : null,
    };

    return {
      id: conversation.id.value,
      userAId: conversation.userAId,
      userBId: conversation.userBId,
      matchId: conversation.matchId,
      otherUser,
      lastMessage: conversation.lastMessage
        ? {
            id: conversation.lastMessage.id.value,
            senderId: conversation.lastMessage.senderId,
            preview: conversation.lastMessage.content.preview,
            createdAt: conversation.lastMessage.createdAt,
          }
        : null,
      unreadCount: conversation.getUnreadCount(userId),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessageAt: conversation.lastMessageAt,
    };
  }

  /**
   * Convert list of Conversation entities to ConversationListResponseDTO
   * Enriches with other user data
   */
  static async toListResponseDTOAsync(
    conversations: Conversation[],
    userId: string,
    total: number,
    hasMore: boolean,
    nextCursor: string | null
  ): Promise<ConversationListResponseDTO> {
    // Get all unique other user IDs
    const otherUserIds = [
      ...new Set(conversations.map((c) => (c.userAId === userId ? c.userBId : c.userAId))),
    ];

    // Batch fetch all profiles
    const profiles = await prismaClient.profile.findMany({
      where: { userId: { in: otherUserIds } },
      select: {
        userId: true,
        displayName: true,
        birthDate: true,
      },
    });

    const profileMap = new Map(
      profiles.map((p: { userId: string; displayName: string; birthDate: Date }) => [p.userId, p])
    );

    // Batch fetch all photos
    const photos = await prismaClient.media.findMany({
      where: {
        userId: { in: otherUserIds },
        type: 'PHOTO',
        status: 'READY',
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        userId: true,
        url: true,
      },
    });

    // Create photo map (first photo per user)
    const photoMap = new Map<string, string>();
    for (const photo of photos) {
      if (!photoMap.has(photo.userId) && photo.url) {
        photoMap.set(photo.userId, photo.url);
      }
    }

    // Helper function to calculate age
    const calculateAge = (birthDate: Date): number => {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 1 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    // Build response with enriched data
    const enrichedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        const otherUserId =
          conversation.userAId === userId ? conversation.userBId : conversation.userAId;

        const profile = profileMap.get(otherUserId);
        const photoUrl = photoMap.get(otherUserId) ?? null;

        const otherUser: ConversationOtherUserDTO = {
          id: otherUserId,
          displayName: profile?.displayName ?? 'Usuario',
          age: profile?.birthDate ? calculateAge(profile.birthDate) : 0,
          photoUrl,
        };

        return {
          id: conversation.id.value,
          userAId: conversation.userAId,
          userBId: conversation.userBId,
          matchId: conversation.matchId,
          otherUser,
          lastMessage: conversation.lastMessage
            ? {
                id: conversation.lastMessage.id.value,
                senderId: conversation.lastMessage.senderId,
                preview: conversation.lastMessage.content.preview,
                createdAt: conversation.lastMessage.createdAt,
              }
            : null,
          unreadCount: conversation.getUnreadCount(userId),
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          lastMessageAt: conversation.lastMessageAt,
        };
      })
    );

    return {
      conversations: enrichedConversations,
      total,
      hasMore,
      nextCursor,
    };
  }
}
