# Chat Service - Analise Arquitetural

> Documento de analise do ecossistema e planejamento do micro-servico de Chat
> Data: 2026-03-05

---

## 1. Visao Geral do Ecossistema

### 1.1 Stack Tecnologica Consistente

Todos os micro-servicos do RelationshipApp utilizam o mesmo stack:

| Tecnologia | Versao | Uso |
|------------|--------|-----|
| **Fastify** | 5.x | Web framework (mais performatico que Express) |
| **TypeScript** | 5.x | Type safety |
| **Prisma** | 6.x | ORM + PostgreSQL (shared DB) |
| **Socket.io** | 4.x | WebSocket real-time |
| **Redis (ioredis)** | 5.x | Pub/Sub para Socket.io adapter (multi-instancia) |
| **@socket.io/redis-adapter** | 8.x | Sync entre instancias do Chat Service |
| **Zod** | 3.x/4.x | Validacao de schemas |
| **Pino** | 9.x/10.x | Logging estruturado |
| **@fastify/jwt** | 9.x/10.x | Autenticacao JWT |
| **Axios** | 1.x | HTTP client para Notification Service |
| **Node** | 20+ | Runtime |

> **NOTA:** BullMQ NAO sera usado. Redis e apenas para Socket.io adapter.
> Para integracao com Notification Service, usamos HTTP direto.

### 1.2 Arquitetura (Clean Architecture)

```
src/
├── domain/           # Entidades, Value Objects, Domain Services, Aggregates
├── application/      # Use Cases, DTOs, Ports (interfaces), Validators, Event Handlers
├── infrastructure/   # DB/Prisma, Repositories, Cache, External Services, Queue
├── presentation/     # Routes, Handlers/Controllers
├── config/          # Configuracoes
└── container/       # Dependency Injection
```

### 1.3 Padroes Estabelecidos

- Dependency Injection via container
- Repository Pattern
- Use Case Pattern
- Event-driven com BullMQ (Outbox Pattern no CORE)
- Shared database entre servicos (mesmo PostgreSQL)
- JWT authentication compartilhado

### 1.4 Micro-servicos Existentes

| Servico | Porta | Responsabilidade |
|---------|-------|------------------|
| **CORE** | 3000 | Auth, Users, Profiles, Matches, Swipes, Blocks |
| **Feed** | 3002 | Recomendacoes, Compatibilidade astral |
| **Media** | 3003 | Upload de fotos/videos (S3) |
| **Notification** | 3004 | Push notifications, In-app inbox |
| **Chat** | 3005? | **A ser implementado** |

---

## 2. Estado Atual do Frontend (React Native)

### 2.1 Ja Implementado

- Socket.io-client configurado (`SocketClient.ts`)
- Tipos de mensagens definidos (`MessageType`, `MessageStatus`)
- Eventos WebSocket definidos:
  - `NEW_MESSAGE`
  - `MESSAGE_READ`
  - `TYPING`
  - `USER_ONLINE`
  - `USER_OFFLINE`

### 2.2 Pendente no Frontend

- `ChatApiRepository` - chamadas REST para o backend
- Chat Use Cases - logica de negocio
- Chat Hooks - hooks customizados
- Chat Screens/Components - UI do chat

---

## 3. Features Planejadas para o Chat Service

### 3.1 MVP (Essencial)

| Feature | Descricao | Prioridade |
|---------|-----------|------------|
| **Conversas 1:1** | Chat privado entre usuarios com match | Alta |
| **Mensagens de Texto** | Envio/recebimento de texto | Alta |
| **Status de Mensagem** | Sent -> Delivered -> Read | Alta |
| **Historico de Chat** | Persistencia e paginacao | Alta |
| **WebSocket Real-time** | Socket.io para comunicacao em tempo real | Alta |
| **Typing Indicator** | Indicador "digitando..." | Media |

### 3.2 Features Estendidas (Futuro)

| Feature | Descricao | Prioridade |
|---------|-----------|------------|
| **Midia em Mensagens** | Imagens, videos, audio (integracao Media Service) | Media |
| **Reacoes/Emoji** | React com emoji nas mensagens | Baixa |
| **Reply/Quote** | Responder mensagem especifica | Media |
| **Edit Message** | Editar mensagem enviada | Baixa |
| **Delete Message** | Soft delete de mensagens | Media |
| **Online/Presence** | Status online/offline dos usuarios | Media |
| **Busca em Mensagens** | Full-text search no historico | Baixa |
| **Chat em Grupo** | Conversas com multiplos participantes | Futuro |

---

## 4. Integracoes com Outros Servicos

```
+-------------------------------------------------------------+
|                     CHAT SERVICE                            |
+-------------------------------------------------------------+
|  +-------------+   +-------------+   +-------------+       |
|  |   CORE DB   |   |   MEDIA     |   | NOTIFICATION|       |
|  |  (Matches,  |   |  SERVICE    |   |  SERVICE    |       |
|  |   Blocks)   |   | (uploads)   |   |  (push)     |       |
|  +------+------+   +------+------+   +------+------+       |
|         |                 |                 |               |
|         v                 v                 v               |
|  - Verificar match  - Upload midia   - Push notif          |
|  - Verificar block  - URLs assinadas  - Novas msgs         |
+-------------------------------------------------------------+
```

### 4.1 Integracao com CORE

- Verificar se existe match entre usuarios antes de permitir chat
- Verificar se existe block entre usuarios
- Dados de perfil dos participantes

### 4.2 Integracao com Media Service

- Upload de imagens/videos no chat
- URLs assinadas para download seguro

### 4.3 Integracao com Notification Service

- Push notification quando usuario esta offline
- Badges de mensagens nao lidas

---

## 5. Modelos de Dados (Prisma Schema)

### 5.1 Conversas

```prisma
model Conversation {
  id           String   @id @default(uuid())
  userAId      String   @map("user_a_id")
  userBId      String   @map("user_b_id")
  matchId      String?  @map("match_id")      // Referencia ao match
  lastMessageAt DateTime @default(now()) @map("last_message_at")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  messages     Message[]
  userA        User     @relation("ConvUserA", fields: [userAId])
  userB        User     @relation("ConvUserB", fields: [userBId])

  @@unique([userAId, userBId])
  @@map("conversations")
}
```

### 5.2 Mensagens

```prisma
model Message {
  id             String        @id @default(uuid())
  conversationId String        @map("conversation_id")
  senderId       String        @map("sender_id")
  content        String?       @db.Text
  type           MessageType   @default(TEXT)
  mediaUrl       String?       @map("media_url")
  mediaType      String?       @map("media_type")
  status         MessageStatus @default(SENT)
  replyToId      String?       @map("reply_to_id")
  editedAt       DateTime?     @map("edited_at")
  deletedAt      DateTime?     @map("deleted_at")
  createdAt      DateTime      @default(now())

  conversation   Conversation  @relation(fields: [conversationId], references: [id])
  sender         User          @relation(fields: [senderId], references: [id])
  replyTo        Message?      @relation("MessageReply", fields: [replyToId])
  reactions      MessageReaction[]
  readReceipts   MessageReadReceipt[]

  @@index([conversationId, createdAt])
  @@map("messages")
}
```

### 5.3 Read Receipts

```prisma
model MessageReadReceipt {
  id        String   @id @default(uuid())
  messageId String   @map("message_id")
  userId    String   @map("user_id")
  readAt    DateTime @default(now())

  message   Message  @relation(fields: [messageId], references: [id])

  @@unique([messageId, userId])
  @@map("message_read_receipts")
}
```

### 5.4 Reacoes (Emoji)

```prisma
model MessageReaction {
  id        String   @id @default(uuid())
  messageId String   @map("message_id")
  userId    String   @map("user_id")
  emoji     String
  createdAt DateTime @default(now())

  message   Message  @relation(fields: [messageId], references: [id])

  @@unique([messageId, userId, emoji])
  @@map("message_reactions")
}
```

### 5.5 Enums

```prisma
enum MessageType {
  TEXT
  IMAGE
  VIDEO
  AUDIO
  SYSTEM    // mensagens do sistema (ex: "voces deram match!")
}

enum MessageStatus {
  SENT
  DELIVERED
  READ
}
```

---

## 6. Integracao com Notification Service (HTTP)

> **DECISAO:** NAO usar BullMQ no Chat Service.
> Integracao via HTTP direto para o endpoint `/internal/events` do Notification Service.
>
> **Razoes:**
> - WebSocket ja cobre comunicacao real-time
> - Menos complexidade (sem Redis/filas)
> - Notification Service ja tem endpoint HTTP para eventos

### 6.1 Endpoint do Notification Service

```
POST http://notification-service:3004/internal/events
Headers: X-Internal-API-Key: <api_key>
```

### 6.2 Schema do Evento (Ja Definido pelo Notification Service)

```typescript
// chat.message.sent - ja esperado pelo Notification Service
{
  eventId: string (uuid),
  eventType: "chat.message.sent",
  occurredAt: string (datetime),
  traceId?: string (uuid),
  producer?: string,
  payload: {
    conversationId: string (uuid),
    messageId: string (uuid),
    senderId: string (uuid),
    receiverId: string (uuid),
    preview: string (max 200 chars)
  }
}
```

### 6.3 Fluxo de Notificacao

```
[Chat Service]
     │
     ├─→ WebSocket (Socket.io) → Usuario ONLINE (real-time)
     │
     └─→ HTTP POST /internal/events → [Notification Service]
              │
              └─→ Processa evento → Push (FCM/APNS) / In-App Inbox
```

### 6.4 Implementacao no Chat Service

```typescript
// infrastructure/http/NotificationHttpClient.ts
export class NotificationHttpClient {
  constructor(private readonly baseUrl: string, private readonly apiKey: string) {}

  async sendMessageSentEvent(payload: MessageSentPayload): Promise<void> {
    await axios.post(`${this.baseUrl}/internal/events`, {
      eventId: uuid(),
      eventType: 'chat.message.sent',
      occurredAt: new Date().toISOString(),
      producer: 'chat-service',
      payload
    }, {
      headers: { 'X-Internal-API-Key': this.apiKey }
    })
  }
}
```

### 6.5 Eventos Futuros (Pode Consumir do CORE)

| Evento | Origem | Acao | Metodo |
|--------|--------|------|--------|
| `match.created` | CORE | Criar conversa automaticamente | HTTP webhook ou polling |
| `user.blocked` | CORE | Desabilitar chat | HTTP webhook ou polling |

---

## 7. WebSocket Events (Socket.io)

### 7.1 Server -> Client

| Evento | Payload | Descricao |
|--------|---------|-----------|
| `message:received` | Message | Nova mensagem recebida |
| `message:delivered` | { messageId, deliveredAt } | Confirmacao de entrega |
| `message:read` | { messageId, readAt, readBy } | Confirmacao de leitura |
| `typing:start` | { conversationId, userId } | Usuario comecou a digitar |
| `typing:stop` | { conversationId, userId } | Usuario parou de digitar |
| `user:online` | { userId } | Usuario ficou online |
| `user:offline` | { userId, lastSeen } | Usuario ficou offline |

### 7.2 Client -> Server

| Evento | Payload | Descricao |
|--------|---------|-----------|
| `message:send` | { conversationId, content, type? } | Enviar mensagem |
| `message:mark-read` | { messageId } | Marcar como lida |
| `typing:start` | { conversationId } | Iniciar indicador |
| `typing:stop` | { conversationId } | Parar indicador |
| `conversation:join` | { conversationId } | Entrar na sala |
| `conversation:leave` | { conversationId } | Sair da sala |

---

## 8. Questoes Pendentes (Definir com o Time)

1. **Escopo MVP vs Full:** Comecar com essencial (texto + real-time + historico) ou incluir midia/reacoes desde inicio?

2. **Presenca/Online:** Status online/offline dos usuarios e importante para o MVP?

3. **Soft Delete vs Hard Delete:** Mensagens deletadas devem ser recuperaveis ou permanentes?

4. **Limite de Historico:** Alguma politica de retencao (mensagens antigas arquivadas/apagadas)?

5. **Integracao com Match:** Chat so permitido entre usuarios que deram match?

6. **Moderacao:** Algum tipo de filtro de conteudo/moderacao automatica no MVP?

7. **Criptografia:** Mensagens criptografadas end-to-end ou apenas em transito (HTTPS/WSS)?

---

## 9. Proxima Porta Sugerida

- **Chat Service:** Porta `3005`
