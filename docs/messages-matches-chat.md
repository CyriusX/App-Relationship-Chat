# Reliable chat inbox — local validation

Branch: `fix/messages-matches-chat`, based on `fix/discovery-feed-consistency`.

Apply `prisma/migrations/202610310001_inbox/migration.sql` before starting the service, then regenerate Prisma. The authorized local stack shares its database with CORE: do not synchronize the Chat schema with `db push`.

```bash
npx prisma db execute --file prisma/migrations/202610310001_inbox/migration.sql --schema src/infrastructure/database/prisma/schema.prisma
npm run prisma:generate
```

The transactional SQL is additive/idempotent. It adds client message identity, immutable command hash, stable ordering indexes and a durable outbox. Existing messages may have no client identity. The worker starts with the service and uses independent socket and Notification lanes. Socket delivery tolerates duplicate publication; clients reconcile persisted IDs. Notification confirms processing explicitly and retries failures.

HTTP `/v1` and socket writes share ChatInboxUseCases. Opening requires a real authorized match and serializes pair creation. Sending accepts `clientMessageId`, scoped by sender/conversation. An identical retry returns the original message; changed command content returns 409 even after edit/delete. HTTP is the new app's confirmed-send path. Reads advance only through an authorized presented message and never regress. Search/unread/cursors and the global summary do not depend on loaded pages.

Executed: 9 Vitest files / 70 tests passed, TypeScript passed (baseline also passed). Commands: `npm test`, `npm run typecheck`. Real local API/socket tests additionally cover concurrent opening, duplicate commands, identical intentional texts, pagination, bounded read, privacy, active-account authorization and bilateral blocks. Notification interruption/recovery and repeated outbox publication were tested against the running services.

The app repository contains scripts, native two-emulator screenshots and the full report at `docs/validation/messages-matches-chat/README.md`. External FCM/APNs delivery remains outside this local evidence.
