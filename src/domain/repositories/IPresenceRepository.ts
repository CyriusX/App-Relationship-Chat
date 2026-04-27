import { PresenceStatus, LastSeen } from '../value-objects';

/**
 * User presence data
 */
export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  lastSeen: LastSeen;
  socketId?: string;
}

/**
 * Presence Repository Interface (Port)
 * Defines the contract for user presence tracking (Redis)
 */
export interface IPresenceRepository {
  /**
   * Set user as online
   */
  setOnline(userId: string, socketId: string): Promise<void>;

  /**
   * Set user as offline
   */
  setOffline(userId: string, socketId?: string): Promise<void>;

  /**
   * Get user presence status
   */
  getPresence(userId: string): Promise<UserPresence | null>;

  /**
   * Get multiple users presence
   */
  getMultiplePresence(userIds: string[]): Promise<Map<string, UserPresence>>;

  /**
   * Update user last seen
   */
  updateLastSeen(userId: string): Promise<void>;

  /**
   * Get all online users
   */
  getOnlineUsers(): Promise<string[]>;

  /**
   * Get socket IDs for a user (may have multiple connections)
   */
  getSocketIds(userId: string): Promise<string[]>;

  /**
   * Remove socket connection
   */
  removeSocket(socketId: string): Promise<void>;

  /**
   * Set typing indicator for a user in a conversation
   */
  setTyping(conversationId: string, userId: string): Promise<void>;

  /**
   * Remove typing indicator for a user in a conversation
   */
  removeTyping(conversationId: string, userId: string): Promise<void>;

  /**
   * Get users typing in a conversation
   */
  getTypingUsers(conversationId: string): Promise<string[]>;

  /**
   * Update user presence status
   */
  updateStatus(userId: string, status: PresenceStatus): Promise<void>;
}
