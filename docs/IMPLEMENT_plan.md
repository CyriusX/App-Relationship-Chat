# Chat Service - Plano de Implementação

> Documento de planejamento detalhado para o micro-servico de Chat
> Data: 2026-03-05

---

## Resumo das Deciso~es

| Feature               | Decisao                        |
| --------------------- | ------------------------------ |
| **Midia**             | Depois (MVP so texto)          |
| **Deletar mensagem**  | Sim (soft delete)              |
| **Editar mensagem**   | Sim                            |
| **Presenca/Online**   | Sim (online/offline/last seen) |
| **Chat so com match** | Sim (verificar match antes)    |

---

## Fases

### Phase 1: Foundation & Setup ✅ COMPLETED

- [x] Project initialization (package.json, tsconfig, eslint, prettier)
- [x] Environment configuration (.env, config)
- [x] Basic folder structure
- [x] Logger and shared utilities
- [x] Container/Dependency Injection setup
- [x] Basic health check endpoint
- [x] JWT authentication setup
- [x] Socket.io server setup with Redis adapter
- [x] HTTP client for Notification Service
- [x] Prisma schema setup (basic tables, migrations)
- [x] Unit tests setup
- [x] Documentation (README, API docs)

### Phase 2: Domain Layer ✅ COMPLETED

- [x] Entities (Conversation, Message)
- [x] Value Objects (MessageContent, ConversationId, MessageId, MessageStatus, MessageType, PresenceStatus, LastSeen)
- [x] Domain Services (MessageDomainService, ConversationDomainService)
- [x] Repository Interfaces (IConversationRepository, IMessageRepository, IPresenceRepository)
- [x] Domain Events (MessageSent, MessageEdited, MessageDeleted, MessageRead, TypingStarted, TypingStopped, UserPresenceChanged, ConversationCreated)
- [x] Domain Errors (ConversationErrors, MessageErrors, ChatNotAuthorizedError)
- [x] Unit tests for domain layer (55 tests passing)
- [x] Review: type safety, domain logic correctness

### Phase 3: Application Layer ✅ COMPLETED

- [x] DTOs (CreateMessageDTO, UpdateMessageDTO, MessageResponseDTO, ConversationDTO, PresenceDTO)
- [x] Ports/Interfaces (INotificationClient, IMatchValidator)
- [x] Mappers (MessageMapper, ConversationMapper)
- [x] Validators (message, conversation, presence Zod schemas)
- [x] Use cases
  - [x] SendMessageUseCase
  - [x] EditMessageUseCase
  - [x] DeleteMessageUseCase
  - [x] GetMessageHistoryUseCase
  - [x] GetConversationUseCase
  - [x] GetConversationHistoryUseCase
  - [x] ListConversationsUseCase
  - [x] CreateConversationUseCase
  - [x] MarkAsReadUseCase
  - [x] HandleTypingIndicatorUseCase
  - [x] UpdatePresenceUseCase
- [x] TypeScript compilation passing
- [x] All tests passing (55 tests)
- [x] Review: business logic, DTO validation

### Phase 4: Infrastructure Layer ✅ COMPLETED

- [x] Prisma repositories (ConversationRepository, MessageRepository)
- [x] Redis PresenceRepository (presence, typing indicators)
- [x] Notification HTTP client
- [x] Match Validator HTTP client
- [x] Socket.io server setup with Redis adapter
- [x] DI Container setup with all dependencies
- [x] TypeScript compilation passing
- [x] All tests passing (55 tests)
- [x] Review: repository implementations, external integrations

### Phase 5: Presentation Layer ✅ COMPLETED

- [x] REST routes
  - [x] GET /conversations (list user conversations)
  - [x] GET /conversations/:id (get conversation details)
  - [x] GET /conversations/:id/messages (get messages history)
  - [x] POST /conversations/:id/messages (send message)
  - [x] PATCH /messages/:id (edit message)
  - [x] DELETE /messages/:id (soft delete message)
  - [x] POST /conversations/:id/read (mark as read)
- [x] WebSocket routes (Socket.io event handlers)
  - [x] message:send, message:edit, message:delete, message:read
  - [x] typing:start, typing:stop
  - [x] presence:update
- [x] Controllers (ConversationController, MessageController)
- [x] ChatSocketHandlers for real-time communication
- [x] TypeScript compilation passing
- [x] All tests passing (55 tests)
- [x] Review: API design, error handling, validation

### Phase 6: Integration & Final Review ✅ COMPLETED

- [x] Docker setup (docker-compose.yml, Dockerfile)
- [x] Database seed script for testing
- [x] README with comprehensive API documentation
- [x] TypeScript compilation passing
- [x] All tests passing (55 tests)
- [ ] Frontend integration (update ChatApiRepository, hooks)
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Security review
- [ ] Deploy to production
