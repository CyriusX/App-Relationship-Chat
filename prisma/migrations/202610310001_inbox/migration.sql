BEGIN;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS client_message_id TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS client_command_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS chat_message_client_identity ON chat_messages(sender_id, conversation_id, client_message_id);
CREATE INDEX IF NOT EXISTS chat_message_order ON chat_messages(conversation_id, created_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS chat_inbox_outbox (
 id TEXT PRIMARY KEY, event_type TEXT NOT NULL, payload JSONB NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 processed_at TIMESTAMP(3), next_attempt_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS chat_inbox_outbox_pending ON chat_inbox_outbox(next_attempt_at) WHERE processed_at IS NULL;
COMMIT;
