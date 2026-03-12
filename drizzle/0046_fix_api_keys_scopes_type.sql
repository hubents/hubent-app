-- Fix: api_keys.scopes and webhooks.events were defined as text[] in SQL
-- but Drizzle schema uses json/jsonb. Convert to jsonb for compatibility.

-- Convert api_keys.scopes from text[] to jsonb
ALTER TABLE "api_keys" ALTER COLUMN "scopes" SET DATA TYPE jsonb USING to_jsonb("scopes");
ALTER TABLE "api_keys" ALTER COLUMN "scopes" SET DEFAULT '[]'::jsonb;

-- Convert webhooks.events from text[] to jsonb
ALTER TABLE "webhooks" ALTER COLUMN "events" SET DATA TYPE jsonb USING to_jsonb("events");
ALTER TABLE "webhooks" ALTER COLUMN "events" SET DEFAULT '[]'::jsonb;
