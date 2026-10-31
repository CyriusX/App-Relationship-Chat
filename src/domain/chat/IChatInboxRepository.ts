export interface InboxMessage {
  id: string;
  conversationId: string;
  senderId: string;
  clientMessageId: string | null;
  content: string | null;
  type: string;
  status: string;
  replyToId: string | null;
  mediaUrl: string | null;
  editedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
}
export interface InboxConversation {
  id: string;
  matchId: string | null;
  userAId: string;
  userBId: string;
  otherUser: {
    id: string;
    displayName: string;
    age: number | null;
    photoUrl: string | null;
    available: boolean;
  };
  lastMessage: { id: string; senderId: string; preview: string; createdAt: Date } | null;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}
export interface SendInboxMessage {
  conversationId: string;
  clientMessageId?: string;
  content: string;
  type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
  replyToId?: string;
  mediaUrl?: string;
}
export interface ConversationQuery {
  limit: number;
  offset?: number;
  cursor?: string;
  q?: string;
  unreadOnly?: boolean;
}
export interface IChatInboxRepository {
  list(
    userId: string,
    query: ConversationQuery
  ): Promise<{
    conversations: InboxConversation[];
    total: number;
    hasMore: boolean;
    nextCursor: string | null;
  }>;
  summary(userId: string): Promise<{ unreadMessages: number; unreadConversations: number }>;
  open(userId: string, otherUserId: string, matchId?: string): Promise<InboxConversation>;
  get(userId: string, conversationId: string): Promise<InboxConversation>;
  history(
    userId: string,
    conversationId: string,
    limit: number,
    cursor?: string,
    before?: string
  ): Promise<{ messages: InboxMessage[]; hasMore: boolean; nextCursor: string | null }>;
  send(userId: string, input: SendInboxMessage): Promise<InboxMessage>;
  read(
    userId: string,
    conversationId: string,
    lastReadMessageId?: string
  ): Promise<{ count: number }>;
  change(userId: string, messageId: string, content: string | null): Promise<InboxMessage>;
}
