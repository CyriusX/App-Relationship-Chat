# Environment Configuration

## Overview

The Relationship App ecosystem consists of multiple services that share a common database and authentication system. This document describes the environment configuration for all services.

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React Native)                      │
│                    http://localhost:19006 (Expo)                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  CORE SERVICE   │ │  CHAT SERVICE   │ │  FEED SERVICE   │
│   Port 3000     │ │   Port 3001     │ │   Port 3002     │
│                 │ │                 │ │                 │
│  • Auth (JWT)   │ │  • Messages     │ │  • Swipe Feed   │
│  • Users        │ │  • Conversations│ │  • Synastry     │
│  • Matches      │ │  • Presence     │ │  • Matching     │
│  • Blocks       │ │  • WebSocket    │ │                 │
│  • Profiles     │ │                 │ │                 │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │      PostgreSQL (NeonDB)     │
              │     (Shared Database)        │
              │                              │
              │  users, profiles, matches,   │
              │  blocks, chat_conversations, │
              │  chat_messages, etc.         │
              └──────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │           Redis              │
              │   (Cache & Socket Adapter)   │
              └──────────────────────────────┘
```

## Database Sharing Rules

| Table | CORE | Feed | Chat |
|-------|------|------|------|
| `users` | RW | R | R |
| `profiles` | RW | R | R |
| `photos` | RW | R | R |
| `matches` | RW | R | R |
| `blocks` | RW | - | R |
| `chat_conversations` | - | - | RW |
| `chat_messages` | - | - | RW |
| `chat_*` | - | - | RW |

**Important:** Only CORE service runs migrations. Other services use `prisma generate` only.

## Environment Variables

### Chat Service (.env)

```bash
# ===========================================
# Application
# ===========================================
NODE_ENV=development
PORT=3001
SERVICE_NAME=chat-service

# ===========================================
# Database (PostgreSQL - SHARED)
# ===========================================
# Use the same DATABASE_URL as CORE service
DATABASE_URL="postgresql://user:password@host:5432/relationship_app?schema=public"

# ===========================================
# Redis
# ===========================================
REDIS_URL="redis://localhost:6379"
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ===========================================
# JWT (MUST match CORE service)
# ===========================================
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# ===========================================
# Socket.io
# ===========================================
SOCKET_CORS_ORIGIN=http://localhost:3000,http://localhost:19006
SOCKET_PATH=/socket.io

# ===========================================
# Service URLs
# ===========================================
CORE_SERVICE_URL=http://localhost:3000
FEED_SERVICE_URL=http://localhost:3002
NOTIFICATION_SERVICE_URL=http://localhost:3003

# ===========================================
# Internal API
# ===========================================
INTERNAL_API_KEY=your-internal-api-key

# ===========================================
# Logging
# ===========================================
LOG_LEVEL=debug

# ===========================================
# Rate Limiting
# ===========================================
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

### Frontend (.env)

```bash
# ===========================================
# CORE Service (Auth, Users, Matches)
# ===========================================
EXPO_PUBLIC_API_URL=http://192.168.0.101:3000

# ===========================================
# Chat Service (Messages, Conversations)
# ===========================================
EXPO_PUBLIC_CHAT_SERVICE_URL=http://192.168.0.101:3001
EXPO_PUBLIC_CHAT_WS_URL=ws://192.168.0.101:3001

# ===========================================
# Feed Service (Swipe Feed)
# ===========================================
EXPO_PUBLIC_FEED_SERVICE_URL=http://192.168.0.101:3002

# ===========================================
# Notification Service
# ===========================================
EXPO_PUBLIC_NOTIFICATION_SERVICE_URL=http://192.168.0.101:3003

# ===========================================
# Legacy (points to Chat Service)
# ===========================================
EXPO_PUBLIC_WS_URL=ws://192.168.0.101:3001

# ===========================================
# App Configuration
# ===========================================
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_APP_NAME=Relationship App
EXPO_PUBLIC_APP_VERSION=1.0.0
```

## Local Development Setup

### 1. Start Infrastructure

```bash
# Start PostgreSQL and Redis
cd AppRelationshipChat
docker-compose up postgres redis -d
```

### 2. Run Database Migrations (from CORE)

```bash
cd AppRelationshipCORE
npx prisma migrate dev
```

### 3. Generate Prisma Client (Chat Service)

```bash
cd AppRelationshipChat
npx prisma generate
```

### 4. Start Services

```bash
# Terminal 1 - CORE Service
cd AppRelationshipCORE
npm run dev

# Terminal 2 - Chat Service
cd AppRelationshipChat
npm run dev

# Terminal 3 - Feed Service
cd AppRelationshipFeed
npm run dev
```

### 5. Start Frontend

```bash
cd AppRelationshipFrontEnd
npm start
```

## Production Configuration

### Environment Variables (Production)

```bash
# Chat Service Production
NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://...neon.tech/relationship_app?sslmode=require"
REDIS_URL="redis://...redis.cloud:6379"
JWT_SECRET=<secure-random-string>
INTERNAL_API_KEY=<secure-random-string>
LOG_LEVEL=info
```

### Security Checklist

- [ ] Use secure, random `JWT_SECRET` (min 32 characters)
- [ ] Use secure, random `INTERNAL_API_KEY`
- [ ] Enable SSL for database connections
- [ ] Configure Redis authentication
- [ ] Set appropriate `SOCKET_CORS_ORIGIN`
- [ ] Use HTTPS/WSS in production
- [ ] Enable rate limiting
- [ ] Configure proper logging level (info/warn)

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
npx prisma db pull

# Regenerate Prisma client
npx prisma generate
```

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli ping
```

### JWT Token Issues

Ensure `JWT_SECRET` is identical across all services that need to verify tokens.

### WebSocket Connection Issues

1. Check `SOCKET_CORS_ORIGIN` includes frontend URL
2. Verify frontend is using correct `CHAT_WS_URL`
3. Check firewall/proxy allows WebSocket connections
