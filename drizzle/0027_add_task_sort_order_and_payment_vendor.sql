-- Migration: Add sort_order to tasks and vendor_id to task_payments
-- Task 86aeh3cvt - Mejoras en Tareas y Pagos

-- Add sort_order to tasks table for reordering within Kanban columns (per event)
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0;

-- Add vendor_id to task_payments for linking payments to vendors
ALTER TABLE "task_payments" ADD COLUMN IF NOT EXISTS "vendor_id" integer REFERENCES "vendors"("id");

-- Add payment method and notes fields to task_payments
ALTER TABLE "task_payments" ADD COLUMN IF NOT EXISTS "payment_method" text;
ALTER TABLE "task_payments" ADD COLUMN IF NOT EXISTS "notes" text;

-- Create index for faster sorting queries
CREATE INDEX IF NOT EXISTS "tasks_event_sort_idx" ON "tasks" ("event_id", "status", "sort_order");
