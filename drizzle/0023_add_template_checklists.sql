-- Migration: Add template checklists and htmlContent to task_templates
-- Date: 2026-01-23

-- Add htmlContent column to task_templates for storing "Explicación" content
ALTER TABLE "task_templates" ADD COLUMN IF NOT EXISTS "html_content" text;

-- Create task_template_checklists table for storing checklist items in templates
CREATE TABLE IF NOT EXISTS "task_template_checklists" (
  "id" serial PRIMARY KEY,
  "task_template_id" integer NOT NULL REFERENCES "task_templates"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "sort_order" integer DEFAULT 0
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_task_template_checklists_task_template_id" ON "task_template_checklists"("task_template_id");
