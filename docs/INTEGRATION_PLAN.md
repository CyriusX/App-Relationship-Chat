# Chat Service Integration Plan

**Project:** Relationship App - Chat Service Integration
**Date:** 2026-03-05
**Status:** Awaiting Approval

---

## Executive Summary

This document outlines the integration plan for the **Chat Service** (`AppRelationshipChat`) with the existing ecosystem:

1. **CORE Service** (`AppRelationship CORE`) - Auth, Users, Matches, Blocks
2. **Feed Service** (`AppRelationshipFeed`) - Swipe Feed, Compatibility
3. **Frontend** (`AppRelationshipFrontEnd`) - React Native Mobile App

The Chat Service is **already implemented** with Clean Architecture (DDD + SOLID). This plan focuses on **integration touchpoints** and **required changes** in each project.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MOBILE APP                                      │
│                    AppRelationshipFrontEnd (React Native)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   Auth      │  │   Feed      │  │   Chat      │  │  Profile    │       │
│  │   Flow      │  │   Screens   │  │   Screens   │  │   Screens   │       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
│         │                │                │                │               │
│         ▼                ▼                ▼                ▼               │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    Infrastructure Layer                               │  │
│  │  • Axios HTTP Client  • Socket.io Client  • SecureStore (JWT)       │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│     CORE SERVICE     │ │    FEED SERVICE      │ │    CHAT SERVICE      │
│   (Port 3000)        │ │   (Port 3002)        │ │   (Port 3001)        │
│                      │ │                      │ │                      │
│  • Auth (JWT)        │ │  • GET /v1/feed      │ │  • REST API          │
│  • Users             │ │  • Compatibility     │ │  • WebSocket         │
│  • Swipes            │ │  • BullMQ Jobs       │ │  • Messages          │
│  • Matches           │ │                      │ │  • Conversations     │
│  • Blocks            │ │                      │ │  • Presence          │
└──────────┬───────────┘ └──────────┬───────────┘ └──────────┬───────────┘
           │                        │                        │
           └────────────────────────┼────────────────────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────────┐
                    │         SHARED DATABASE          │
                    │         PostgreSQL (NeonDB)      │
                    │                                  │
                    │  • users        • matches        │
                    │  • profiles     • swipes         │
                    │  • blocks       • conversations  │
                    │  • reports      • messages       │
                    └──────────────────────────────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────────┐
                    │             REDIS               │
                    │                                  │
                    │  • BullMQ Queues (Feed)          │
                    │  • Presence Cache (Chat)         │
                    │  • Socket Sessions (Chat)        │
                    └──────────────────────────────────┘
```

---

## Key Integration Points

### 1. Shared Database

All services share the same PostgreSQL database. The Chat Service needs read access to:

| Table | Purpose | Access |
|-------|---------|--------|
| `users` | User validation | READ |
| `profiles` | Display names, photos | READ |
| `matches` | Match validation before chat | READ |
| `blocks` | Block validation before messaging | READ |
| `conversations` | Chat conversations | READ/WRITE |
| `messages` | Chat messages | READ/WRITE |

### 2. JWT Authentication

The Chat Service must validate JWT tokens issued by CORE:

```typescript
// Same JWT_SECRET as CORE
const decoded = jwt.verify(token, process.env.JWT_SECRET!)

// User context structure
req.user = {
  sub: "user_123",  // userId
  iat: 1705300200,
  exp: 1705386600
}
```

### 3. Match Validation (Critical Business Rule)

**Only matched users can chat.** Before creating a conversation or sending a message:

```typescript
// Check if users have a valid match
const hasMatch = await prisma.match.findFirst({
  where: {
    OR: [
      { userAId: senderId, userBId: recipientId },
      { userAId: recipientId, userBId: senderId }
    ]
  }
})

if (!hasMatch) {
  throw new Error('USERS_NOT_MATCHED')
}
```

### 4. Block Validation

Users cannot message blocked users:

```typescript
const hasBlock = await prisma.block.findFirst({
  where: {
    OR: [
      { blockerId: senderId, blockedId: recipientId },
      { blockerId: recipientId, blockedId: senderId }
    ]
  }
})

if (hasBlock) {
  throw new Error('USER_BLOCKED')
}
```

---

## Phase 1: Database Schema Alignment

### Task 1.1: Create Prisma Schema for Chat Service

The Chat Service needs its own Prisma schema that includes chat tables AND references to shared tables.

**File:** `prisma/schema.prisma`

```prisma
// ============================================
// SHARED TABLES (Read-only for Chat Service)
// ============================================

model User {
  id        String   @id
  email     String   @unique
  name      String
  status    UserStatus @default(PENDING)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  profile   Profile?
  matchesA  Match[]  @references("userAId")
  matchesB  Match[]  @references("userBId")
  blocks    Block[]  @references("blockerId")
  blockedBy Block[]  @references("blockedId")
}

model Profile {
  id          String    @id @default(cuid())
  userId      String    @unique
  displayName String
  birthDate   DateTime
  bio         String?
  showAge     Boolean   @default(true)

  // Location
  latitude    Float?
  longitude   Float?
  city        String?
  state       String?

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  photos      Photo[]

  @@map("profiles")
}

model Photo {
  id          String   @id @default(cuid())
  profileId   String
  url         String
  description String?  @db.VarChar(200)
  order       Int      @default(0)
  isMain      Boolean  @default(false)
  createdAt   DateTime @default(now())

  profile     Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@map("photos")
}

model Match {
  id        String          @id @default(cuid())
  userAId   String
  userBId   String
  createdBy MatchCreatedBy
  createdAt DateTime        @default(now())

  userA     User            @relation("userAId", fields: [userAId], references: [id])
  userB     User            @relation("userBId", fields: [userBId], references: [id])

  conversation Conversation?

  @@unique([userAId, userBId])
  @@map("matches")
}

model Block {
  id        String   @id @default(cuid())
  blockerId String
  blockedId String
  reason    String?
  createdAt DateTime @default(now())

  blocker   User     @relation("blockerId", fields: [blockerId], references: [id])
  blocked   User     @relation("blockedId", fields: [blockedId], references: [id])

  @@unique([blockerId, blockedId])
  @@map("blocks")
}

// ============================================
// CHAT SERVICE TABLES (Read/Write)
// ============================================

model Conversation {
  id           String    @id @default(cuid())
  matchId      String    @unique
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  lastMessageAt DateTime?

  match        Match     @relation(fields: [matchId], references: [id])
  messages     Message[]

  @@map("conversations")
}

model Message {
  id             String        @id @default(cuid())
  conversationId String
  senderId       String
  content        String?       @db.Text
  type           MessageType   @default(TEXT)
  status         MessageStatus @default(SENT)
  replyToId      String?

  mediaUrl       String?
  editedAt       DateTime?
  deletedAt      DateTime?
  readAt         DateTime?
  createdAt      DateTime      @default(now())

  conversation   Conversation  @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  replyTo        Message?      @relation("ReplyTo", fields: [replyToId], references: [id])
  replies        Message[]     @relation("ReplyTo")

  @@index([conversationId, createdAt])
  @@index([senderId])
  @@map("messages")
}

enum MessageType {
  TEXT
  IMAGE
  VIDEO
  AUDIO
  FILE
}

enum MessageStatus {
  SENT
  DELIVERED
  READ
}

enum UserStatus {
  PENDING
  ACTIVE
  DISABLED
}

enum MatchCreatedBy {
  MUTUAL_LIKE
  SUPERLIKE
}
```

### Task 1.2: Update Chat Service Environment

**File:** `.env`

```env
# Database (Same as CORE)
DATABASE_URL="postgresql://..."

# Redis
REDIS_URL="redis://localhost:6379"

# JWT (Same secret as CORE for token validation)
JWT_SECRET="same-secret-as-core-service"

# Server
PORT=3001
NODE_ENV=development

# Service URLs
CORE_SERVICE_URL=http://localhost:3000
FEED_SERVICE_URL=http://localhost:3002
```

---

## Phase 2: Chat Service Updates

### Task 2.1: Add Match Validation to CreateConversationUseCase

**File:** `src/application/use-cases/conversation/CreateConversationUseCase.ts`

```typescript
// Add match validation before creating conversation
async execute(input: CreateConversationInput): Promise<CreateConversationOutput> {
  // 1. Check if match exists
  const match = await this.matchRepository.findByUsers(input.userId, input.recipientId)

  if (!match) {
    throw new BusinessRuleError('USERS_NOT_MATCHED', 'Cannot create conversation without a match')
  }

  // 2. Check for blocks
  const hasBlock = await this.blockRepository.existsBetween(input.userId, input.recipientId)

  if (hasBlock) {
    throw new BusinessRuleError('USER_BLOCKED', 'Cannot create conversation with blocked user')
  }

  // 3. Check if conversation already exists
  const existing = await this.conversationRepository.findByMatchId(match.id)

  if (existing) {
    return { conversationId: existing.id, isNew: false }
  }

  // 4. Create conversation
  const conversation = Conversation.create({
    id: generateId(),
    matchId: match.id,
  })

  await this.conversationRepository.save(conversation)

  return { conversationId: conversation.id, isNew: true }
}
```

### Task 2.2: Add Match Validation to SendMessageUseCase

**File:** `src/application/use-cases/message/SendMessageUseCase.ts`

```typescript
async execute(input: SendMessageInput): Promise<SendMessageOutput> {
  // 1. Get conversation and validate participants
  const conversation = await this.conversationRepository.findById(input.conversationId)

  if (!conversation) {
    throw new NotFoundError('Conversation not found')
  }

  // 2. Validate sender is participant
  const match = await this.matchRepository.findById(conversation.matchId)

  const isParticipant = match.userAId === input.senderId || match.userBId === input.senderId

  if (!isParticipant) {
    throw new AuthorizationError('Not a participant in this conversation')
  }

  // 3. Check blocks still valid
  const recipientId = match.userAId === input.senderId ? match.userBId : match.userAId

  const hasBlock = await this.blockRepository.existsBetween(input.senderId, recipientId)

  if (hasBlock) {
    throw new BusinessRuleError('USER_BLOCKED', 'Cannot send message to blocked user')
  }

  // 4. Create and save message
  const message = Message.create({
    id: generateId(),
    conversationId: input.conversationId,
    senderId: input.senderId,
    content: input.content,
    type: input.type || MessageType.TEXT,
  })

  await this.messageRepository.save(message)

  // 5. Update conversation
  conversation.updateLastMessageAt()
  await this.conversationRepository.save(conversation)

  return { message }
}
```

### Task 2.3: Add Repository Interfaces for Match and Block

**File:** `src/domain/repositories/IMatchRepository.ts`

```typescript
export interface IMatchRepository {
  findById(id: string): Promise<Match | null>
  findByUsers(userAId: string, userBId: string): Promise<Match | null>
  findByUserId(userId: string, page: number, limit: number): Promise<Match[]>
}
```

**File:** `src/domain/repositories/IBlockRepository.ts`

```typescript
export interface IBlockRepository {
  existsBetween(userId1: string, userId2: string): Promise<boolean>
}
```

### Task 2.4: Implement Prisma Repositories for Match and Block

**File:** `src/infrastructure/database/repositories/MatchRepository.ts`

```typescript
@injectable()
export class MatchRepository implements IMatchRepository {
  async findByUsers(userAId: string, userBId: string): Promise<Match | null> {
    // Normalize order (userAId < userBId in database)
    const [normalizedA, normalizedB] = userAId < userBId
      ? [userAId, userBId]
      : [userBId, userAId]

    const record = await prisma.match.findFirst({
      where: {
        userAId: normalizedA,
        userBId: normalizedB,
      },
    })

    if (!record) return null

    return Match.restore(
      record.id,
      record.userAId,
      record.userBId,
      record.createdBy as MatchCreatedBy,
      record.createdAt
    )
  }

  // ... other methods
}
```

---

## Phase 3: Frontend Integration

### Task 3.1: Update API Configuration

**File:** `src/config/api-config.ts` (Frontend)

```typescript
export const API_ENDPOINTS = {
  // ... existing endpoints

  // Chat - Update to point to Chat Service
  CHAT: {
    GET_CONVERSATIONS: '/v1/conversations',
    GET_MESSAGES: '/v1/conversations/:id/messages',
    SEND_MESSAGE: '/v1/messages',
    MARK_READ: '/v1/messages/:id/read',
    EDIT_MESSAGE: '/v1/messages/:id',
    DELETE_MESSAGE: '/v1/messages/:id',
    GET_PRESENCE: '/v1/presence/:userId',
  },
} as const
```

### Task 3.2: Update Socket Configuration

**File:** `src/config/socket-config.ts` (Frontend)

```typescript
import env from './env'

export const SOCKET_CONFIG = {
  // Point to Chat Service WebSocket
  url: env.CHAT_WS_URL || `${env.CHAT_API_URL.replace('http', 'ws')}`,
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  reconnectionDelayMax: 10000,
  timeout: 10000,
  transports: ['websocket'],
}

// Align events with Chat Service
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Auth
  AUTHENTICATE: 'authenticate',
  AUTH_SUCCESS: 'authenticated',
  AUTH_ERROR: 'auth_error',

  // Messages (match Chat Service events)
  MESSAGE_SEND: 'message:send',
  MESSAGE_NEW: 'message:new',
  MESSAGE_SENT: 'message:sent',
  MESSAGE_ERROR: 'message:error',
  MESSAGE_READ: 'message:read',
  MESSAGE_EDIT: 'message:edit',
  MESSAGE_DELETE: 'message:delete',

  // Typing
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',

  // Presence
  PRESENCE_ONLINE: 'presence:online',
  PRESENCE_OFFLINE: 'presence:offline',
  PRESENCE_UPDATE: 'presence:update',

  // Conversations
  CONVERSATION_JOIN: 'conversation:join',
  CONVERSATION_LEAVE: 'conversation:leave',
} as const
```

### Task 3.3: Create Chat API Repository

**File:** `src/infrastructure/http/repositories/ChatApiRepository.ts` (Frontend)

```typescript
import { apiClient } from '../client/api-client'
import { API_ENDPOINTS } from '@/config/api-config'
import type { Conversation, Message } from '@/presentation/screens/connections/types/chat.types'

export interface IChatApiRepository {
  getConversations(page?: number, limit?: number): Promise<Conversation[]>
  getMessages(conversationId: string, page?: number, limit?: number): Promise<Message[]>
  sendMessage(conversationId: string, content: string, type?: string): Promise<Message>
  markAsRead(messageId: string): Promise<void>
  editMessage(messageId: string, content: string): Promise<Message>
  deleteMessage(messageId: string): Promise<void>
}

export class ChatApiRepository implements IChatApiRepository {
  async getConversations(page = 1, limit = 20): Promise<Conversation[]> {
    const response = await apiClient.get(API_ENDPOINTS.CHAT.GET_CONVERSATIONS, {
      params: { page, limit },
    })
    return response.data.data
  }

  async getMessages(conversationId: string, page = 1, limit = 50): Promise<Message[]> {
    const endpoint = API_ENDPOINTS.CHAT.GET_MESSAGES.replace(':id', conversationId)
    const response = await apiClient.get(endpoint, {
      params: { page, limit },
    })
    return response.data.data
  }

  async sendMessage(conversationId: string, content: string, type = 'text'): Promise<Message> {
    const response = await apiClient.post(API_ENDPOINTS.CHAT.SEND_MESSAGE, {
      conversationId,
      content,
      type,
    })
    return response.data.data
  }

  async markAsRead(messageId: string): Promise<void> {
    const endpoint = API_ENDPOINTS.CHAT.MARK_READ.replace(':id', messageId)
    await apiClient.patch(endpoint)
  }

  async editMessage(messageId: string, content: string): Promise<Message> {
    const endpoint = API_ENDPOINTS.CHAT.EDIT_MESSAGE.replace(':id', messageId)
    const response = await apiClient.patch(endpoint, { content })
    return response.data.data
  }

  async deleteMessage(messageId: string): Promise<void> {
    const endpoint = API_ENDPOINTS.CHAT.DELETE_MESSAGE.replace(':id', messageId)
    await apiClient.delete(endpoint)
  }
}

export const chatApiRepository = new ChatApiRepository()
```

### Task 3.4: Create Chat Use Cases (Frontend)

**File:** `src/application/use-cases/chat/GetConversationsUseCase.ts` (Frontend)

```typescript
import { inject, injectable } from 'tsyringe'
import type { IChatApiRepository } from '@/infrastructure/http/repositories/ChatApiRepository'
import type { Conversation } from '@/presentation/screens/connections/types/chat.types'

export interface GetConversationsInput {
  page?: number
  limit?: number
}

export interface GetConversationsOutput {
  conversations: Conversation[]
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
  }
}

@injectable()
export class GetConversationsUseCase {
  constructor(
    @inject('IChatApiRepository')
    private readonly chatRepository: IChatApiRepository
  ) {}

  async execute(input: GetConversationsInput): Promise<GetConversationsOutput> {
    const { page = 1, limit = 20 } = input

    const conversations = await this.chatRepository.getConversations(page, limit)

    return {
      conversations,
      pagination: {
        page,
        limit,
        total: conversations.length,
        hasNext: conversations.length === limit,
      },
    }
  }
}
```

### Task 3.5: Create Chat Hooks (Frontend)

**File:** `src/presentation/hooks/chat/useConversations.ts` (Frontend)

```typescript
import { useQuery } from '@tanstack/react-query'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback } from 'react'
import { container } from 'tsyringe'
import { GetConversationsUseCase } from '@/application/use-cases/chat/GetConversationsUseCase'

export function useConversations(page = 1, limit = 20) {
  const getConversationsUseCase = container.resolve(GetConversationsUseCase)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['conversations', page, limit],
    queryFn: () => getConversationsUseCase.execute({ page, limit }),
    staleTime: 30000, // 30 seconds
  })

  // Refetch when screen gains focus
  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  return {
    conversations: data?.conversations ?? [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch,
  }
}
```

### Task 3.6: Update SocketClient (Frontend)

**File:** `src/infrastructure/websocket/SocketClient.ts` (Frontend)

Update to align with Chat Service events:

```typescript
import { io, Socket } from 'socket.io-client'
import { SOCKET_CONFIG, SOCKET_EVENTS } from '@/config/socket-config'
import { tokenStorage } from '@/infrastructure/storage'

export class SocketClient {
  private socket: Socket | null = null
  private isAuthenticated = false

  connect(): void {
    if (this.socket?.connected) return

    this.socket = io(SOCKET_CONFIG.url, {
      ...SOCKET_CONFIG,
      auth: {
        token: tokenStorage.getAccessTokenSync(), // Add sync version or handle async
      },
    })

    this.setupEventListeners()
  }

  // Updated to match Chat Service events
  sendMessage(conversationId: string, content: string, tempId: string): void {
    if (!this.isAuthenticated) return

    this.socket?.emit(SOCKET_EVENTS.MESSAGE_SEND, {
      tempId,
      conversationId,
      content,
      type: 'text',
    })
  }

  sendTyping(conversationId: string, isTyping: boolean): void {
    if (!this.isAuthenticated) return

    this.socket?.emit(
      isTyping ? SOCKET_EVENTS.TYPING_START : SOCKET_EVENTS.TYPING_STOP,
      { conversationId }
    )
  }

  markAsRead(conversationId: string, messageIds: string[]): void {
    if (!this.isAuthenticated) return

    this.socket?.emit(SOCKET_EVENTS.MESSAGE_READ, {
      conversationId,
      messageIds,
    })
  }

  joinConversation(conversationId: string): void {
    if (!this.isAuthenticated) return

    this.socket?.emit(SOCKET_EVENTS.CONVERSATION_JOIN, { conversationId })
  }

  leaveConversation(conversationId: string): void {
    if (!this.isAuthenticated) return

    this.socket?.emit(SOCKET_EVENTS.CONVERSATION_LEAVE, { conversationId })
  }

  // Event listeners
  onNewMessage(callback: (message: any) => void): void {
    this.socket?.on(SOCKET_EVENTS.MESSAGE_NEW, callback)
  }

  onMessageSent(callback: (data: { tempId: string; messageId: string }) => void): void {
    this.socket?.on(SOCKET_EVENTS.MESSAGE_SENT, callback)
  }

  onTypingStart(callback: (data: { conversationId: string; userId: string }) => void): void {
    this.socket?.on(SOCKET_EVENTS.TYPING_START, callback)
  }

  onTypingStop(callback: (data: { conversationId: string; userId: string }) => void): void {
    this.socket?.on(SOCKET_EVENTS.TYPING_STOP, callback)
  }

  onPresenceUpdate(callback: (data: { userId: string; isOnline: boolean }) => void): void {
    this.socket?.on(SOCKET_EVENTS.PRESENCE_UPDATE, callback)
  }

  // ... rest of implementation
}
```

### Task 3.7: Update ConversationsListScreen (Frontend)

**File:** `src/presentation/screens/connections/ConversationsListScreen.tsx` (Frontend)

Replace mock data with real API:

```typescript
import React, { useState, useMemo } from 'react'
import { View, Text, FlatList } from 'react-native'
import { ConversationCard, SearchBar, ConversationCardSkeleton } from '../../components'
import { useConversations } from '@/presentation/hooks/chat/useConversations'

export function ConversationsListScreen() {
  const [searchQuery, setSearchQuery] = useState('')
  const { conversations, isLoading, refetch } = useConversations()

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations

    const query = searchQuery.toLowerCase()
    return conversations.filter((conv) =>
      conv.otherUser.displayName.toLowerCase().includes(query)
    )
  }, [conversations, searchQuery])

  return (
    <View className="flex-1">
      <View className="px-4 mb-4">
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      <FlatList
        data={isLoading ? Array(4).fill(null) : filteredConversations}
        keyExtractor={(item, index) => item?.id || `skeleton-${index}`}
        renderItem={({ item }) =>
          item ? (
            <View className="px-4 mb-3">
              <ConversationCard
                conversation={item}
                onPress={() => console.log('Navigate to chat:', item.id)}
              />
            </View>
          ) : (
            <View className="px-4 mb-3">
              <ConversationCardSkeleton />
            </View>
          )
        }
        contentContainerClassName="pb-4"
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          !isLoading && (
            <View className="items-center justify-center pt-16">
              <Text className="text-center text-gray-500">
                {searchQuery.trim()
                  ? 'Nenhuma conversa encontrada'
                  : 'Você ainda não tem conversas. Dê match para começar!'}
              </Text>
            </View>
          )
        }
      />
    </View>
  )
}
```

---

## Phase 4: Environment Configuration

### Task 4.1: Frontend Environment Variables

**File:** `.env` (Frontend)

```env
# API URLs
EXPO_PUBLIC_API_URL=http://localhost:3000/v1
EXPO_PUBLIC_CHAT_API_URL=http://localhost:3001/v1
EXPO_PUBLIC_FEED_API_URL=http://localhost:3002/v1

# WebSocket URLs
EXPO_PUBLIC_WS_URL=ws://localhost:3001
EXPO_PUBLIC_CHAT_WS_URL=ws://localhost:3001

# Environment
EXPO_PUBLIC_ENV=development
```

### Task 4.2: Update Environment Config (Frontend)

**File:** `src/config/env.ts` (Frontend)

```typescript
export default {
  // CORE Service
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/v1',

  // Chat Service
  CHAT_API_URL: process.env.EXPO_PUBLIC_CHAT_API_URL || 'http://localhost:3001/v1',
  CHAT_WS_URL: process.env.EXPO_PUBLIC_CHAT_WS_URL || 'ws://localhost:3001',

  // Feed Service
  FEED_API_URL: process.env.EXPO_PUBLIC_FEED_API_URL || 'http://localhost:3002/v1',

  // WebSocket (Legacy - points to Chat)
  WS_BASE_URL: process.env.EXPO_PUBLIC_CHAT_WS_URL || 'ws://localhost:3001',

  // Environment
  ENV: process.env.EXPO_PUBLIC_ENV || 'development',
}
```

---

## Phase 5: Match-to-Chat Flow

### Task 5.1: Create Conversation After Match

When a match is created in CORE, it should emit an event that triggers conversation creation:

**Option A: Event-Driven (Recommended)**

CORE emits `match.created` event → Chat Service listens → Creates conversation

```typescript
// In CORE Service after match creation
eventBus.emit('match.created', {
  matchId: match.id,
  userAId: match.userAId,
  userBId: match.userBId,
})

// In Chat Service
eventBus.on('match.created', async (data) => {
  await createConversationUseCase.execute({
    matchId: data.matchId,
  })
})
```

**Option B: Lazy Creation (Simpler)**

Conversation is created when first message is sent:

```typescript
// Frontend: When user taps "Send Message" on match
const handleStartConversation = async (matchId: string) => {
  // Check if conversation exists
  let conversation = await getConversationByMatchId(matchId)

  if (!conversation) {
    // Create conversation
    conversation = await createConversation({ matchId })
  }

  // Navigate to chat
  navigation.navigate('Chat', { conversationId: conversation.id })
}
```

---

## Phase 6: API Gateway (Optional Future)

For production, consider an API Gateway to route requests:

```
                                    ┌─────────────────┐
                                    │   API Gateway   │
                                    │   (Port 80/443) │
                                    └────────┬────────┘
                                             │
              ┌──────────────────────────────┼──────────────────────────────┐
              │                              │                              │
              ▼                              ▼                              ▼
    ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
    │  /v1/auth/*     │          │  /v1/chat/*     │          │  /v1/feed/*     │
    │  /v1/users/*    │          │  /v1/conversations/*       │  /v1/synastry/* │
    │  /v1/matches/*  │          │  /v1/messages/* │          │                 │
    │  /v1/swipes/*   │          │  /socket.io/*   │          │                 │
    └────────┬────────┘          └────────┬────────┘          └────────┬────────┘
             │                            │                            │
             ▼                            ▼                            ▼
    ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
    │   CORE SERVICE  │          │  CHAT SERVICE   │          │  FEED SERVICE   │
    │   (Port 3000)   │          │  (Port 3001)    │          │  (Port 3002)    │
    └─────────────────┘          └─────────────────┘          └─────────────────┘
```

---

## Implementation Timeline

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|--------------|
| Phase 1 | Database Schema Alignment | 1 day | None |
| Phase 2 | Chat Service Updates | 2 days | Phase 1 |
| Phase 3 | Frontend Integration | 2-3 days | Phase 2 |
| Phase 4 | Environment Configuration | 0.5 day | Phase 3 |
| Phase 5 | Match-to-Chat Flow | 1 day | Phase 2, Phase 3 |
| Phase 6 | Testing & Validation | 2 days | All phases |

**Total: 8-10 days**

---

## Testing Checklist

### Chat Service

- [ ] TypeScript compiles without errors
- [ ] All unit tests pass
- [ ] Match validation works (rejects non-matched users)
- [ ] Block validation works (rejects blocked users)
- [ ] WebSocket connection with JWT auth works
- [ ] Message sending/receiving works
- [ ] Typing indicators work
- [ ] Presence tracking works

### Frontend

- [ ] API calls reach Chat Service
- [ ] WebSocket connects to Chat Service
- [ ] Conversations list loads real data
- [ ] Messages load and display correctly
- [ ] Send message works
- [ ] Real-time messages appear
- [ ] Typing indicators display
- [ ] Online/offline status displays

### Integration

- [ ] Match required before conversation
- [ ] Block prevents messaging
- [ ] JWT validation consistent across services
- [ ] Database queries work correctly
- [ ] Redis presence cache works

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| JWT mismatch | Use same JWT_SECRET across services |
| Database schema drift | Shared Prisma schema, migrations from CORE only |
| WebSocket connection issues | Implement reconnection with exponential backoff |
| Race conditions in conversation creation | Use unique constraint on matchId |
| Missing match/block validation | Add validation at both REST and WebSocket layers |

---

## Approval

- [ ] Phase 1: Database Schema Alignment
- [ ] Phase 2: Chat Service Updates
- [ ] Phase 3: Frontend Integration
- [ ] Phase 4: Environment Configuration
- [ ] Phase 5: Match-to-Chat Flow
- [ ] Phase 6: Testing & Validation

**Approver:** ________________
**Date:** ________________
