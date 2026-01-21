-- Migration: Add event_tables and guest improvements
-- Ticket: 86aehbk2h - Mejoras Lista de Invitados

-- Create event_tables for floor plan / seating chart
CREATE TABLE IF NOT EXISTS "event_tables" (
  "id" serial PRIMARY KEY,
  "event_id" integer NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "shape" text DEFAULT 'round',
  "capacity" integer DEFAULT 8,
  "position_x" integer DEFAULT 100,
  "position_y" integer DEFAULT 100,
  "width" integer DEFAULT 120,
  "height" integer DEFAULT 120,
  "rotation" integer DEFAULT 0,
  "color" text DEFAULT '#ffffff',
  "created_at" timestamp DEFAULT now()
);

-- Add new fields to guests table
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "table_id" integer REFERENCES "event_tables"("id") ON DELETE SET NULL;
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "age_group" text DEFAULT 'adult';
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "menu_preference" text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "guests_table_id_idx" ON "guests"("table_id");
CREATE INDEX IF NOT EXISTS "guests_age_group_idx" ON "guests"("age_group");
CREATE INDEX IF NOT EXISTS "event_tables_event_id_idx" ON "event_tables"("event_id");

-- Create guest_checkins table for check-in feature
CREATE TABLE IF NOT EXISTS "guest_checkins" (
  "id" serial PRIMARY KEY,
  "guest_id" integer NOT NULL REFERENCES "guests"("id") ON DELETE CASCADE,
  "checked_in_at" timestamp NOT NULL DEFAULT now(),
  "checked_in_by" text REFERENCES "users"("id"),
  "notes" text
);

CREATE INDEX IF NOT EXISTS "guest_checkins_guest_id_idx" ON "guest_checkins"("guest_id");
