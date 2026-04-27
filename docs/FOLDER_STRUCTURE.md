# Chat Service - Estrutura de Pastas (DDD + SOLID)

> Arquitetura visual do micro-servico de Chat
> Data: 2026-03-05

---

## Diagrama de Camadas

```
                                    ┌─────────────────────────────────┐
                                    │         EXTERNAL WORLD          │
                                    │  (Mobile App, Socket.io, APIs)  │
                                    └────────────────┬────────────────┘
                                                     │
                                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              4. PRESENTATION LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   REST      │  │  WebSocket  │  │ Middlewares │  │    DTOs     │            │
│  │  Routes     │  │  Handlers   │  │             │  │ (Req/Res)   │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
└─────────┼────────────────┼────────────────┼────────────────┼───────────────────┘
          │                │                │                │
          └────────────────┴────────────────┴────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              3. APPLICATION LAYER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Use Cases  │  │    Ports    │  │   Mappers   │  │  Validators │            │
│  │             │  │ (Interfaces)│  │             │  │    (Zod)    │            │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘  └─────────────┘            │
└─────────┼────────────────┼──────────────────────────────────────────────────────┘
          │                │
          │ Uses           │ Defines
          ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              2. DOMAIN LAYER (Centro)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Entities   │  │   Value     │  │   Domain    │  │  Repository │            │
│  │             │  │  Objects    │  │  Services   │  │  Interfaces │            │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                                 │
│  ┌─────────────┐  ┌─────────────┐                                              │
│  │   Domain    │  │   Domain    │                                              │
│  │   Events    │  │   Errors    │                                              │
│  └─────────────┘  └─────────────┘                                              │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ Implements
                                    │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              1. INFRASTRUCTURE LAYER                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Prisma    │  │   Socket.io │  │   Redis     │  │   HTTP      │            │
│  │  Repository │  │   Server    │  │   Adapter   │  │   Client    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Estrutura de Pastas Completa

```
chat-service/
│
├── src/
│   │
│   ├── domain/                              # ═══════════════════════════════════
│   │   │                                    # DOMAIN LAYER (Centro - Zero deps)
│   │   │                                    # ═══════════════════════════════════
│   │   │
│   │   ├── entities/                        # Entidades com identidade unica
│   │   │   ├── Conversation.ts              # Aggregate Root
│   │   │   ├── Message.ts                   # Entity (filha de Conversation)
│   │   │   └── index.ts                     # Barrel export
│   │   │
│   │   ├── value-objects/                   # Objetos imutaveis sem identidade
│   │   │   ├── MessageContent.ts            # Conteudo validado da mensagem
│   │   │   ├── ConversationId.ts            # ID tipado
│   │   │   ├── MessageId.ts                 # ID tipado
│   │   │   ├── MessageStatus.ts             # Enum: SENT, DELIVERED, READ
│   │   │   ├── MessageType.ts               # Enum: TEXT, IMAGE, VIDEO, AUDIO
│   │   │   ├── PresenceStatus.ts            # Enum: ONLINE, OFFLINE, AWAY
│   │   │   ├── LastSeen.ts                  # Value object para last seen
│   │   │   └── index.ts                     # Barrel export
│   │   │
│   │   ├── services/                        # Domain Services
│   │   │   ├── MessageDomainService.ts      # Logica entre multiplos messages
│   │   │   ├── ConversationDomainService.ts # Logica de conversas
│   │   │   └── index.ts                     # Barrel export
│   │   │
│   │   ├── events/                          # Domain Events
│   │   │   ├── MessageSent.ts               # Evento: mensagem enviada
│   │   │   ├── MessageEdited.ts             # Evento: mensagem editada
│   │   │   ├── MessageDeleted.ts            # Evento: mensagem deletada (soft)
│   │   │   ├── MessageRead.ts               # Evento: mensagem lida
│   │   │   ├── TypingStarted.ts             # Evento: comecou a digitar
│   │   │   ├── TypingStopped.ts             # Evento: parou de digitar
│   │   │   ├── UserPresenceChanged.ts       # Evento: status presenca mudou
│   │   │   ├── ConversationCreated.ts       # Evento: conversa criada
│   │   │   └── index.ts                     # Barrel export
│   │   │
│   │   ├── errors/                          # Domain Errors
│   │   │   ├── ConversationErrors.ts        # Erros de conversa
│   │   │   ├── MessageErrors.ts             # Erros de mensagem
│   │   │   ├── ChatNotAuthorizedError.ts    # Sem match/block
│   │   │   └── index.ts                     # Barrel export
│   │   │
│   │   └── repositories/                    # Repository INTERFACES (Ports)
│   │       ├── IConversationRepository.ts   # Interface do repo
│   │       ├── IMessageRepository.ts        # Interface do repo
│   │       ├── IPresenceRepository.ts       # Interface para Redis
│   │       └── index.ts                     # Barrel export
│   │
│   │
│   ├── application/                         # ═══════════════════════════════════
│   │   │                                    # APPLICATION LAYER
│   │   │                                    # ═══════════════════════════════════
│   │   │
│   │   ├── use-cases/                       # Casos de uso (Orchestrators)
│   │   │   │
│   │   │   ├── message/                     # Use cases de mensagem
│   │   │   │   ├── SendMessageUseCase.ts
│   │   │   │   ├── EditMessageUseCase.ts
│   │   │   │   ├── DeleteMessageUseCase.ts
│   │   │   │   ├── GetMessageHistoryUseCase.ts
│   │   │   │   ├── MarkMessageAsReadUseCase.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── conversation/                # Use cases de conversa
│   │   │   │   ├── GetConversationUseCase.ts
│   │   │   │   ├── ListConversationsUseCase.ts
│   │   │   │   ├── CreateConversationUseCase.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── presence/                    # Use cases de presenca
│   │   │   │   ├── UpdatePresenceUseCase.ts
│   │   │   │   ├── GetOnlineUsersUseCase.ts
│   │   │   │   ├── GetUserPresenceUseCase.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── typing/                      # Use cases de typing indicator
│   │   │   │   ├── HandleTypingIndicatorUseCase.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── index.ts                     # Barrel export
│   │   │
│   │   ├── dto/                             # Data Transfer Objects
│   │   │   ├── message/
│   │   │   │   ├── CreateMessageDTO.ts
│   │   │   │   ├── UpdateMessageDTO.ts
│   │   │   │   ├── MessageResponseDTO.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── conversation/
│   │   │   │   ├── CreateConversationDTO.ts
│   │   │   │   ├── ConversationResponseDTO.ts
│   │   │   │   ├── ConversationListDTO.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── presence/
│   │   │   │   ├── UpdatePresenceDTO.ts
│   │   │   │   ├── PresenceResponseDTO.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── index.ts                     # Barrel export
│   │   │
│   │   ├── ports/                           # Interfaces para servicos externos
│   │   │   ├── repositories/                # Alias para domain/repositories
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── services/                    # Service Ports
│   │   │   │   ├── INotificationClient.ts   # Porta para Notification Service
│   │   │   │   ├── ICacheService.ts         # Porta para Redis
│   │   │   │   ├── IMatchValidator.ts       # Porta para verificar match
│   │   │   │   ├── ISocketServer.ts         # Porta para Socket.io
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── index.ts                     # Barrel export
│   │   │
│   │   ├── validators/                      # Schemas Zod para validacao
│   │   │   ├── message.validator.ts
│   │   │   ├── conversation.validator.ts
│   │   │   ├── presence.validator.ts
│   │   │   └── index.ts
│   │   │
│   │   └── mappers/                         # Conversao Entity <-> DTO
│   │       ├── MessageMapper.ts
│   │       ├── ConversationMapper.ts
│   │       ├── PresenceMapper.ts
│   │       └── index.ts
│   │
│   │
│   ├── infrastructure/                      # ═══════════════════════════════════
│   │   │                                    # INFRASTRUCTURE LAYER
│   │   │                                    # ═══════════════════════════════════
│   │   │
│   │   ├── database/                        # Prisma + PostgreSQL
│   │   │   ├── prisma/
│   │   │   │   ├── schema.prisma            # Schema do banco
│   │   │   │   ├── migrations/              # Migracoes
│   │   │   │   └── seed.ts                  # Dados iniciais
│   │   │   │
│   │   │   └── client.ts                    # Prisma client singleton
│   │   │
│   │   ├── repositories-impl/               # Repository IMPLEMENTATIONS
│   │   │   ├── PrismaConversationRepository.ts
│   │   │   ├── PrismaMessageRepository.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── cache/                           # Redis para presenca/sessoes
│   │   │   ├── redis-client.ts              # Cliente Redis singleton
│   │   │   ├── RedisPresenceRepository.ts   # Implementacao IPresenceRepository
│   │   │   ├── RedisCacheService.ts         # Implementacao ICacheService
│   │   │   └── index.ts
│   │   │
│   │   ├── websocket/                       # Socket.io Server
│   │   │   ├── server.ts                    # Socket.io server setup
│   │   │   ├── adapters/
│   │   │   │   └── redis-adapter.ts         # Redis adapter para multi-instancia
│   │   │   │
│   │   │   ├── handlers/                    # Event handlers
│   │   │   │   ├── connection.handler.ts    # Connect/Disconnect
│   │   │   │   ├── message.handler.ts       # message:send, message:mark-read
│   │   │   │   ├── conversation.handler.ts  # conversation:join, conversation:leave
│   │   │   │   ├── typing.handler.ts        # typing:start, typing:stop
│   │   │   │   └── presence.handler.ts      # User presence
│   │   │   │
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts       # JWT auth no socket
│   │   │   │   └── rate-limit.middleware.ts # Rate limiting
│   │   │   │
│   │   │   ├── rooms/
│   │   │   │   └── room-manager.ts          # Gerenciamento de salas
│   │   │   │
│   │   │   └── index.ts
│   │   │
│   │   ├── http/                            # HTTP Client para Notification
│   │   │   ├── NotificationHttpClient.ts    # Cliente para Notification Service
│   │   │   ├── MatchValidatorClient.ts      # Cliente para verificar match no CORE
│   │   │   └── index.ts
│   │   │
│   │   └── external-services/               # (Futuro) Integracoes
│   │       └── .gitkeep
│   │
│   │
│   ├── presentation/                        # ═══════════════════════════════════
│   │   │                                    # PRESENTATION LAYER
│   │   │                                    # ═══════════════════════════════════
│   │   │
│   │   ├── http/                            # REST API
│   │   │   │
│   │   │   ├── routes/                      # Definicao de rotas
│   │   │   │   ├── index.ts                 # Router principal
│   │   │   │   ├── conversation.routes.ts   # /conversations/*
│   │   │   │   ├── message.routes.ts        # /messages/*
│   │   │   │   └── health.routes.ts         # /health
│   │   │   │
│   │   │   ├── controllers/                 # Route handlers
│   │   │   │   ├── ConversationController.ts
│   │   │   │   ├── MessageController.ts
│   │   │   │   └── HealthController.ts
│   │   │   │
│   │   │   ├── middlewares/                 # HTTP Middlewares
│   │   │   │   ├── auth.middleware.ts       # JWT validation
│   │   │   │   ├── error-handler.middleware.ts
│   │   │   │   ├── request-id.middleware.ts
│   │   │   │   ├── validate.middleware.ts   # Zod validation
│   │   │   │   └── rate-limit.middleware.ts
│   │   │   │
│   │   │   └── dto/                         # Request/Response DTOs
│   │   │       ├── requests/
│   │   │       │   ├── SendMessageRequest.ts
│   │   │       │   ├── UpdateMessageRequest.ts
│   │   │       │   └── index.ts
│   │   │       │
│   │   │       └── responses/
│   │   │           ├── ApiResponse.ts       # Padrao de resposta
│   │   │           ├── ErrorResponse.ts
│   │   │           └── index.ts
│   │   │
│   │   └── websocket/                       # WebSocket Events (DTOs)
│   │       ├── events/                      # Event definitions
│   │       │   ├── client-to-server.ts      # Events: client -> server
│   │       │   ├── server-to-client.ts      # Events: server -> client
│   │       │   └── index.ts
│   │       │
│   │       └── payloads/                    # Event payloads
│   │           ├── MessagePayload.ts
│   │           ├── TypingPayload.ts
│   │           ├── PresencePayload.ts
│   │           └── index.ts
│   │
│   │
│   ├── shared/                              # ═══════════════════════════════════
│   │   │                                    # SHARED / COMMON
│   │   │                                    # ═══════════════════════════════════
│   │   │
│   │   ├── container/                       # Dependency Injection
│   │   │   ├── index.ts                     # Container principal
│   │   │   ├── tokens.ts                    # DI Tokens (Symbols)
│   │   │   └── setup.ts                     # Container configuration
│   │   │
│   │   ├── config/                          # Configuracoes
│   │   │   ├── index.ts                     # Config aggregator
│   │   │   ├── env.ts                       # Environment variables (Zod)
│   │   │   ├── database.ts                  # DB config
│   │   │   ├── redis.ts                     # Redis config
│   │   │   ├── socket.ts                    # Socket.io config
│   │   │   └── jwt.ts                       # JWT config
│   │   │
│   │   ├── logger/                          # Logging (Pino)
│   │   │   ├── index.ts
│   │   │   └── logger.ts
│   │   │
│   │   ├── utils/                           # Utilitarios
│   │   │   ├── id-generator.ts              # UUID generation
│   │   │   ├── date-utils.ts                # Date helpers
│   │   │   └── index.ts
│   │   │
│   │   └── types/                           # Tipos globais
│   │       ├── result.ts                    # Result/Either pattern
│   │       ├── async.ts                     # Async types
│   │       └── index.ts
│   │
│   │
│   └── main.ts                              # Entry point (Fastify + Socket.io)
│
│
├── test/                                    # ═══════════════════════════════════
│   │                                        # TESTS
│   │                                        # ═══════════════════════════════════
│   │
│   ├── unit/                                # Testes unitarios
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   └── services/
│   │   │
│   │   └── application/
│   │       └── use-cases/
│   │
│   ├── integration/                         # Testes de integracao
│   │   ├── repositories/
│   │   └── websocket/
│   │
│   ├── e2e/                                 # Testes end-to-end
│   │   └── api/
│   │
│   ├── mocks/                               # Mocks e fixtures
│   │   ├── repositories/
│   │   ├── services/
│   │   └── factories/
│   │
│   └── setup.ts                             # Test setup
│
│
├── docs/                                    # Documentacao
│   ├── ARCHITECTURE_ANALYSIS.md
│   ├── IMPLEMENT_plan.md
│   ├── FOLDER_STRUCTURE.md                  # Este arquivo
│   └── API.md                               # (Futuro) API docs
│
│
├── .env.example                             # Environment template
├── .env.test                                # Test environment
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── eslint.config.js
├── prettier.config.js
├── vitest.config.ts                         # Test runner config
└── README.md
```

---

## Resumo por Camada

| Camada | Pasta | Responsabilidade | Dependencias |
|--------|-------|------------------|--------------|
| **Domain** | `src/domain/` | Logica de negocio pura | Nenhuma |
| **Application** | `src/application/` | Casos de uso, orchestracao | Domain |
| **Infrastructure** | `src/infrastructure/` | DB, Redis, Socket.io, HTTP | Application (Ports), Domain |
| **Presentation** | `src/presentation/` | REST, WebSocket handlers | Application |
| **Shared** | `src/shared/` | Utils, config, DI | Nenhuma |

---

## Fluxo de Dependencias (SOLID - DIP)

```
┌─────────────────┐
│  Presentation   │ ────────────────┐
└────────┬────────┘                 │
         │ depends on               │
         ▼                          │
┌─────────────────┐                 │
│  Application    │ ────────────────┤
└────────┬────────┘                 │
         │ depends on               │
         ▼                          │
┌─────────────────┐                 │
│     Domain      │ ◄───────────────┘ (abstractions defined here)
└─────────────────┘
         ▲
         │ implements
┌─────────────────┐
│ Infrastructure  │
└─────────────────┘
```

---

## Arquivos de Entrada

| Arquivo | Proposito |
|---------|-----------|
| `src/main.ts` | Bootstrap do Fastify + Socket.io + DI Container |
| `src/shared/container/setup.ts` | Registro de todas as dependencias |
| `src/shared/config/index.ts` | Carregamento de configuracoes |

---

## Próximos Passos

1. Criar estrutura de pastas vazia
2. Configurar `package.json` com dependencias
3. Configurar `tsconfig.json`
4. Implementar `src/domain/` primeiro
5. Seguir para `src/application/`
6. Implementar `src/infrastructure/`
7. Finalizar com `src/presentation/`

---

**Última atualização:** Marco 2026
**Versão:** 1.0.0
**Status:** ✅ Estrutura de Pastas Definida
