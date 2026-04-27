# Chat Service

Real-time chat micro-service for RelationshipApp built with Fastify, Socket.io, and PostgreSQL.

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Fastify 5.x
- **Language:** TypeScript 5.x
- **Database:** PostgreSQL (Prisma ORM)
- **Cache/Pub-Sub:** Redis (Socket.io adapter)
- **WebSocket:** Socket.io 4.x
- **Validation:** Zod
- **Logging:** Pino
- **Testing:** Vitest
- **DI:** tsyringe

## Architecture

This service follows **Clean Architecture** (DDD + SOLID) principles:

```
src/
├── domain/           # Entities, Value Objects, Domain Services, Repository Interfaces
├── application/      # Use Cases, DTOs, Ports, Validators, Mappers
├── infrastructure/   # Database, Cache, External Services, WebSocket Server
├── presentation/     # HTTP Routes, Controllers, WebSocket Handlers
└── shared/           # Config, Logger, Utils, DI Container
```

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Setup database

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed  # Optional: seed test data
```

### 4. Run development server

```bash
npm run dev
```

The service will be available at `http://localhost:3004`

### Using Docker

```bash
docker-compose up -d
```

This will start PostgreSQL, Redis, and the Chat Service.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Lint code |
| `npm run lint:fix` | Fix lint issues |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Check TypeScript types |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:seed` | Seed database with test data |
| `npm run prisma:studio` | Open Prisma Studio |

## API Documentation

When running in development mode, API documentation is available at:

- Swagger UI: `http://localhost:3004/docs`

### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Full health check with dependencies |
| GET | `/health/live` | Kubernetes liveness probe |
| GET | `/health/ready` | Kubernetes readiness probe |

### Conversation Endpoints

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List user's conversations |
| GET | `/api/conversations/:id` | Get conversation details |
| GET | `/api/conversations/:id/messages` | Get messages history |
| POST | `/api/conversations/:id/messages` | Send a message |
| POST | `/api/conversations/:id/read` | Mark all messages as read |

### Message Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/api/messages/:id` | Edit a message |
| DELETE | `/api/messages/:id` | Soft delete a message |

### Request/Response Examples

#### List Conversations

```http
GET /api/conversations?limit=20&offset=0
Authorization: Bearer <jwt_token>
```

Response:
```json
{
  "conversations": [
    {
      "id": "conv-123",
      "userAId": "user-1",
      "userBId": "user-2",
      "matchId": "match-123",
      "lastMessage": {
        "id": "msg-456",
        "content": "Hello!",
        "senderId": "user-2",
        "createdAt": "2026-03-05T10:00:00Z"
      },
      "unreadCount": 2,
      "createdAt": "2026-03-04T10:00:00Z",
      "updatedAt": "2026-03-05T10:00:00Z",
      "lastMessageAt": "2026-03-05T10:00:00Z"
    }
  ],
  "total": 5,
  "hasMore": false,
  "nextCursor": null
}
```

#### Send Message

```http
POST /api/conversations/conv-123/messages
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "content": "Hello, how are you?",
  "type": "TEXT"
}
```

Response:
```json
{
  "id": "msg-789",
  "conversationId": "conv-123",
  "senderId": "user-1",
  "content": "Hello, how are you?",
  "type": "TEXT",
  "status": "SENT",
  "replyToId": null,
  "mediaUrl": null,
  "isEdited": false,
  "editedAt": null,
  "isDeleted": false,
  "deletedAt": null,
  "createdAt": "2026-03-05T10:30:00Z"
}
```

## WebSocket Events

Connect to `ws://localhost:3004` with JWT token in auth.

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3004', {
  auth: {
    token: '<jwt_token>'
  }
});
```

### Client -> Server

| Event | Payload | Description |
|-------|---------|-------------|
| `message:send` | `{ conversationId, content, type?, replyToId?, mediaUrl? }` | Send a message |
| `message:edit` | `{ messageId, conversationId, content }` | Edit a message |
| `message:delete` | `{ messageId, conversationId }` | Delete a message |
| `message:read` | `{ conversationId }` | Mark messages as read |
| `typing:start` | `{ conversationId }` | Start typing indicator |
| `typing:stop` | `{ conversationId }` | Stop typing indicator |
| `presence:update` | `{ status: 'ONLINE' | 'OFFLINE' | 'AWAY' }` | Update presence status |

### Server -> Client

| Event | Payload | Description |
|-------|---------|-------------|
| `message:new` | `MessageResponseDTO` | New message received |
| `message:edited` | `MessageResponseDTO` | Message was edited |
| `message:deleted` | `{ messageId, conversationId }` | Message was deleted |
| `messages:read` | `{ conversationId, userId, count }` | Messages were read |
| `typing:started` | `{ conversationId, userId }` | User started typing |
| `typing:stopped` | `{ conversationId, userId }` | User stopped typing |
| `presence:changed` | `{ userId, status, lastSeen }` | User presence changed |
| `error` | `{ message, code }` | Error occurred |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3004` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `NOTIFICATION_SERVICE_URL` | Notification service URL | `http://localhost:3003` |
| `MATCH_SERVICE_URL` | Match service URL | `http://localhost:3002` |

## Test Data

After running `npm run prisma:seed`, the following test data is available:

- **Test Users:** `user-test-1`, `user-test-2`, `user-test-3`
- **Test Conversations:** `conv-test-1`, `conv-test-2`
- **Test Messages:** `msg-test-1` through `msg-test-4`

## Project Structure

See [docs/FOLDER_STRUCTURE.md](docs/FOLDER_STRUCTURE.md) for detailed folder structure.

## Implementation Plan

See [docs/IMPLEMENT_plan.md](docs/IMPLEMENT_plan.md) for implementation phases.

## License

MIT
