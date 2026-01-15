-- Notifications history table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "data" json,
  "link" text,
  "read" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at" DESC);
