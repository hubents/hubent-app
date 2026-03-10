-- Migration 0042: Add event_id to form_instances
-- Allows linking forms directly to events (not just tasks)

ALTER TABLE "form_instances" ADD COLUMN IF NOT EXISTS "event_id" integer REFERENCES "events"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "form_instances_event_idx" ON "form_instances" ("event_id") WHERE "event_id" IS NOT NULL;
