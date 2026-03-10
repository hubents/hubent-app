-- Forms Module: Template → Instance → Submission architecture
-- Migration 0041: Add forms, form_fields, form_instances, form_submissions tables

-- ============================================
-- FORM TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS "forms" (
  "id" serial PRIMARY KEY,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'draft',
  "logo_url" text,
  "primary_color" text DEFAULT '#111827',
  "submit_button_text" text DEFAULT 'Enviar',
  "thank_you_title" text DEFAULT '¡Gracias!',
  "thank_you_message" text DEFAULT 'Tu respuesta ha sido registrada.',
  "redirect_url" text,
  "default_event_type" text,
  "notify_on_response" boolean DEFAULT true,
  "notify_email" text,
  "gdpr_enabled" boolean DEFAULT false,
  "gdpr_text" text DEFAULT 'Acepto la política de privacidad.',
  "gdpr_link" text,
  "created_by" text REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- ============================================
-- FORM FIELDS
-- ============================================
CREATE TABLE IF NOT EXISTS "form_fields" (
  "id" serial PRIMARY KEY,
  "form_id" integer NOT NULL REFERENCES "forms"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "label" text NOT NULL,
  "placeholder" text,
  "required" boolean DEFAULT false,
  "crm_mapping" text,
  "options" jsonb,
  "sort_order" integer NOT NULL DEFAULT 0,
  "config" jsonb DEFAULT '{}'
);

-- ============================================
-- FORM INSTANCES (unique ID per task/landing binding)
-- ============================================
CREATE TABLE IF NOT EXISTS "form_instances" (
  "id" serial PRIMARY KEY,
  "form_id" integer NOT NULL REFERENCES "forms"("id") ON DELETE CASCADE,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "type" text NOT NULL DEFAULT 'landing',
  "slug" text,
  "task_id" integer REFERENCES "tasks"("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'active',
  "created_by" text REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "form_instances_slug_idx" ON "form_instances" ("slug") WHERE "slug" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "form_instances_form_task_idx" ON "form_instances" ("form_id", "task_id") WHERE "task_id" IS NOT NULL;

-- ============================================
-- FORM SUBMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS "form_submissions" (
  "id" serial PRIMARY KEY,
  "instance_id" integer NOT NULL REFERENCES "form_instances"("id") ON DELETE CASCADE,
  "form_id" integer NOT NULL REFERENCES "forms"("id") ON DELETE CASCADE,
  "data" jsonb NOT NULL,
  "respondent_name" text,
  "respondent_email" text,
  "respondent_user_id" text REFERENCES "users"("id"),
  "lead_id" integer REFERENCES "leads"("id"),
  "contact_id" integer REFERENCES "contacts"("id"),
  "pdf_url" text,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS "forms_org_idx" ON "forms" ("organization_id");
CREATE INDEX IF NOT EXISTS "form_fields_form_idx" ON "form_fields" ("form_id");
CREATE INDEX IF NOT EXISTS "form_instances_form_idx" ON "form_instances" ("form_id");
CREATE INDEX IF NOT EXISTS "form_instances_task_idx" ON "form_instances" ("task_id") WHERE "task_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "form_submissions_instance_idx" ON "form_submissions" ("instance_id");
CREATE INDEX IF NOT EXISTS "form_submissions_form_idx" ON "form_submissions" ("form_id");
