-- Migration: Add Contacts Tables
-- Description: Unified contact management system for persons and companies

-- Create enums
DO $$ BEGIN
    CREATE TYPE "contact_type" AS ENUM ('person', 'company');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "contact_source" AS ENUM ('manual', 'import', 'website', 'referral', 'social_media', 'event', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "contact_activity_type" AS ENUM ('note', 'call', 'email', 'meeting', 'task_created', 'event_linked', 'lead_converted', 'status_change', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create contacts table
CREATE TABLE IF NOT EXISTS "contacts" (
    "id" serial PRIMARY KEY NOT NULL,
    "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    
    -- Type: person or company
    "type" "contact_type" DEFAULT 'person' NOT NULL,
    
    -- Common fields
    "name" text NOT NULL,
    "email" text,
    "phone" text,
    "phone_country_code" text DEFAULT '+34',
    "avatar" text,
    
    -- Person-specific fields
    "first_name" text,
    "last_name" text,
    "passport_id" text,
    "nie_or_cif" text,
    
    -- Company-specific fields
    "trade_name" text,
    "tax_id" text,
    "website" text,
    "contact_person_name" text,
    "contact_person_email" text,
    
    -- Event-related fields
    "event_date" timestamp,
    "guest_count" integer,
    "budget" numeric(12, 2),
    "venue_type" text,
    
    -- Address fields
    "address" text,
    "city" text,
    "state" text,
    "postal_code" text,
    "country" text DEFAULT 'ES',
    
    -- Bank information
    "bank_name" text,
    "bank_account_number" text,
    "bank_iban" text,
    "bank_swift" text,
    "payment_methods" jsonb,
    
    -- Marketing/CRM fields
    "tags" jsonb,
    "source" "contact_source" DEFAULT 'manual',
    "lead_id" integer REFERENCES "leads"("id"),
    "is_lead" boolean DEFAULT false,
    "lead_score" integer DEFAULT 0,
    "notes" text,
    
    -- Metadata
    "created_by" text REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    "deleted_at" timestamp
);

-- Create contact_documents table
CREATE TABLE IF NOT EXISTS "contact_documents" (
    "id" serial PRIMARY KEY NOT NULL,
    "contact_id" integer NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "url" text NOT NULL,
    "type" text DEFAULT 'document',
    "size" integer,
    "mime_type" text,
    "uploaded_by" text REFERENCES "users"("id"),
    "uploaded_at" timestamp DEFAULT now()
);

-- Create contact_photos table
CREATE TABLE IF NOT EXISTS "contact_photos" (
    "id" serial PRIMARY KEY NOT NULL,
    "contact_id" integer NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
    "url" text NOT NULL,
    "thumbnail" text,
    "caption" text,
    "sort_order" integer DEFAULT 0,
    "uploaded_by" text REFERENCES "users"("id"),
    "uploaded_at" timestamp DEFAULT now()
);

-- Create contact_activities table
CREATE TABLE IF NOT EXISTS "contact_activities" (
    "id" serial PRIMARY KEY NOT NULL,
    "contact_id" integer NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
    "type" "contact_activity_type" NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "metadata" jsonb,
    "created_by" text REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now()
);

-- Create contact_tags table (organization-level tags)
CREATE TABLE IF NOT EXISTS "contact_tags" (
    "id" serial PRIMARY KEY NOT NULL,
    "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "color" text DEFAULT '#6366f1',
    "description" text,
    "created_at" timestamp DEFAULT now()
);

-- Create contact_events junction table
CREATE TABLE IF NOT EXISTS "contact_events" (
    "id" serial PRIMARY KEY NOT NULL,
    "contact_id" integer NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
    "event_id" integer NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
    "role" text,
    "created_at" timestamp DEFAULT now()
);

-- Create contact_tasks junction table
CREATE TABLE IF NOT EXISTS "contact_tasks" (
    "id" serial PRIMARY KEY NOT NULL,
    "contact_id" integer NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
    "task_id" integer NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
    "role" text,
    "created_at" timestamp DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "contacts_organization_id_idx" ON "contacts"("organization_id");
CREATE INDEX IF NOT EXISTS "contacts_type_idx" ON "contacts"("type");
CREATE INDEX IF NOT EXISTS "contacts_email_idx" ON "contacts"("email");
CREATE INDEX IF NOT EXISTS "contacts_lead_id_idx" ON "contacts"("lead_id");
CREATE INDEX IF NOT EXISTS "contacts_deleted_at_idx" ON "contacts"("deleted_at");
CREATE INDEX IF NOT EXISTS "contact_documents_contact_id_idx" ON "contact_documents"("contact_id");
CREATE INDEX IF NOT EXISTS "contact_photos_contact_id_idx" ON "contact_photos"("contact_id");
CREATE INDEX IF NOT EXISTS "contact_activities_contact_id_idx" ON "contact_activities"("contact_id");
CREATE INDEX IF NOT EXISTS "contact_tags_organization_id_idx" ON "contact_tags"("organization_id");
CREATE INDEX IF NOT EXISTS "contact_events_contact_id_idx" ON "contact_events"("contact_id");
CREATE INDEX IF NOT EXISTS "contact_events_event_id_idx" ON "contact_events"("event_id");
CREATE INDEX IF NOT EXISTS "contact_tasks_contact_id_idx" ON "contact_tasks"("contact_id");
CREATE INDEX IF NOT EXISTS "contact_tasks_task_id_idx" ON "contact_tasks"("task_id");

-- Add unique constraint for contact_events and contact_tasks
CREATE UNIQUE INDEX IF NOT EXISTS "contact_events_unique_idx" ON "contact_events"("contact_id", "event_id");
CREATE UNIQUE INDEX IF NOT EXISTS "contact_tasks_unique_idx" ON "contact_tasks"("contact_id", "task_id");
