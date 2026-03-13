-- Migration 0049: Add composio_triggers table and WhatsApp inbound fields
-- For tracking active Composio triggers per organization and receiving inbound WhatsApp messages

CREATE TABLE IF NOT EXISTS "composio_triggers" (
  "id" serial PRIMARY KEY,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "toolkit" text NOT NULL,
  "trigger_slug" text NOT NULL,
  "composio_trigger_id" text NOT NULL UNIQUE,
  "connected_account_id" text,
  "status" text NOT NULL DEFAULT 'active',
  "config" jsonb,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_composio_triggers_org" ON "composio_triggers" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_composio_triggers_toolkit" ON "composio_triggers" ("toolkit");

-- Add WhatsApp inbound fields to task_messages
ALTER TABLE "task_messages" ADD COLUMN IF NOT EXISTS "whatsapp_from" text;
ALTER TABLE "task_messages" ADD COLUMN IF NOT EXISTS "whatsapp_message_id" text;
