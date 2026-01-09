-- Add event_documents table for storing documents attached to events
CREATE TABLE IF NOT EXISTS "event_documents" (
  "id" serial PRIMARY KEY NOT NULL,
  "event_id" integer NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "url" text NOT NULL,
  "type" text DEFAULT 'document',
  "size" integer,
  "mime_type" text,
  "uploaded_by" text REFERENCES "users"("id"),
  "uploaded_at" timestamp DEFAULT now()
);
