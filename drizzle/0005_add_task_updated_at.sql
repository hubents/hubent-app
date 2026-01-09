-- Add updated_at field to tasks table if it doesn't exist
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
