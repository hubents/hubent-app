-- Add category field to tasks table
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'general';
