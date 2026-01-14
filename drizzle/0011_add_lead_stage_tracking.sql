-- Add stage_changed_at column to leads table for tracking time in stage
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "stage_changed_at" timestamp DEFAULT now();

-- Create lead_stage_history table for tracking stage changes
CREATE TABLE IF NOT EXISTS "lead_stage_history" (
  "id" serial PRIMARY KEY,
  "lead_id" integer NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
  "from_stage_id" integer REFERENCES "lead_stages"("id") ON DELETE SET NULL,
  "to_stage_id" integer REFERENCES "lead_stages"("id") ON DELETE SET NULL,
  "changed_by" text REFERENCES "users"("id"),
  "duration_seconds" integer,
  "changed_at" timestamp DEFAULT now()
);

-- Create index for faster queries on lead_stage_history
CREATE INDEX IF NOT EXISTS "lead_stage_history_lead_id_idx" ON "lead_stage_history" ("lead_id");
CREATE INDEX IF NOT EXISTS "lead_stage_history_changed_at_idx" ON "lead_stage_history" ("changed_at");
