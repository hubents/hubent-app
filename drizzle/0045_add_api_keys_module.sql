-- ============================================
-- PUBLIC API MODULE: API Keys, Logs, Idempotency, Webhooks
-- ============================================

-- API Keys
CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" serial PRIMARY KEY,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "key_hash" text NOT NULL UNIQUE,
  "key_prefix" text NOT NULL,
  "scopes" text[] NOT NULL DEFAULT '{}',
  "environment" text NOT NULL DEFAULT 'live',
  "rate_limit" integer DEFAULT 100,
  "expires_at" timestamp,
  "last_used_at" timestamp,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_by" text REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "revoked_at" timestamp,
  "revoked_by" text REFERENCES "users"("id")
);

CREATE INDEX IF NOT EXISTS "idx_api_keys_org" ON "api_keys"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_api_keys_hash" ON "api_keys"("key_hash");
CREATE INDEX IF NOT EXISTS "idx_api_keys_prefix" ON "api_keys"("key_prefix");

-- API Key Usage Logs
CREATE TABLE IF NOT EXISTS "api_key_logs" (
  "id" serial PRIMARY KEY,
  "api_key_id" integer NOT NULL REFERENCES "api_keys"("id") ON DELETE CASCADE,
  "method" text NOT NULL,
  "path" text NOT NULL,
  "status_code" integer NOT NULL,
  "response_time_ms" integer,
  "ip_address" text,
  "user_agent" text,
  "request_id" text NOT NULL,
  "error_code" text,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_api_key_logs_key" ON "api_key_logs"("api_key_id");
CREATE INDEX IF NOT EXISTS "idx_api_key_logs_created" ON "api_key_logs"("created_at");

-- Idempotency Keys
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "id" serial PRIMARY KEY,
  "key" text NOT NULL,
  "api_key_id" integer NOT NULL REFERENCES "api_keys"("id") ON DELETE CASCADE,
  "request_path" text NOT NULL,
  "request_body_hash" text,
  "response_code" integer,
  "response_body" jsonb,
  "created_at" timestamp DEFAULT now(),
  "expires_at" timestamp NOT NULL,
  UNIQUE("key", "api_key_id")
);

CREATE INDEX IF NOT EXISTS "idx_idempotency_keys_lookup" ON "idempotency_keys"("key", "api_key_id");
CREATE INDEX IF NOT EXISTS "idx_idempotency_keys_expires" ON "idempotency_keys"("expires_at");

-- Webhooks
CREATE TABLE IF NOT EXISTS "webhooks" (
  "id" serial PRIMARY KEY,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "secret" text NOT NULL,
  "events" text[] NOT NULL DEFAULT '{}',
  "is_active" boolean NOT NULL DEFAULT true,
  "description" text,
  "created_by" text REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_webhooks_org" ON "webhooks"("organization_id");

-- Webhook Delivery Logs
CREATE TABLE IF NOT EXISTS "webhook_logs" (
  "id" serial PRIMARY KEY,
  "webhook_id" integer NOT NULL REFERENCES "webhooks"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "payload" jsonb NOT NULL,
  "response_code" integer,
  "response_body" text,
  "attempt" integer NOT NULL DEFAULT 1,
  "delivered_at" timestamp,
  "next_retry_at" timestamp,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_webhook_logs_webhook" ON "webhook_logs"("webhook_id");
CREATE INDEX IF NOT EXISTS "idx_webhook_logs_status" ON "webhook_logs"("status");
