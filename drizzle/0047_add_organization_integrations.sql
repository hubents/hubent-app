-- Organization Integrations (Composio)
-- Stores connected apps per organization (1 connection per toolkit per org in MVP)
CREATE TABLE IF NOT EXISTS "organization_integrations" (
  "id" serial PRIMARY KEY,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "toolkit" text NOT NULL,
  "composio_connected_account_id" text,
  "status" text NOT NULL DEFAULT 'disconnected',
  "connected_by" text REFERENCES "users"("id"),
  "connected_email" text,
  "metadata" jsonb,
  "connected_at" timestamp,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT NOW(),
  "updated_at" timestamp DEFAULT NOW(),
  UNIQUE("organization_id", "toolkit")
);
