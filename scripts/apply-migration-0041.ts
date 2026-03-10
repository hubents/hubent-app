import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Migration 0041: Add Forms Module ===\n");

  // 1. Forms table
  await sql`
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
    )
  `;
  console.log("✅ Created forms table");

  // 2. Form fields table
  await sql`
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
    )
  `;
  console.log("✅ Created form_fields table");

  // 3. Form instances table
  await sql`
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
    )
  `;
  console.log("✅ Created form_instances table");

  // 4. Form submissions table
  await sql`
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
    )
  `;
  console.log("✅ Created form_submissions table");

  // 5. Indexes
  try { await sql`CREATE UNIQUE INDEX IF NOT EXISTS "form_instances_slug_idx" ON "form_instances" ("slug") WHERE "slug" IS NOT NULL`; } catch { console.log("⏭️  slug index exists"); }
  try { await sql`CREATE UNIQUE INDEX IF NOT EXISTS "form_instances_form_task_idx" ON "form_instances" ("form_id", "task_id") WHERE "task_id" IS NOT NULL`; } catch { console.log("⏭️  form_task index exists"); }
  try { await sql`CREATE INDEX IF NOT EXISTS "forms_org_idx" ON "forms" ("organization_id")`; } catch { console.log("⏭️  forms_org index exists"); }
  try { await sql`CREATE INDEX IF NOT EXISTS "form_fields_form_idx" ON "form_fields" ("form_id")`; } catch { console.log("⏭️  form_fields index exists"); }
  try { await sql`CREATE INDEX IF NOT EXISTS "form_instances_form_idx" ON "form_instances" ("form_id")`; } catch { console.log("⏭️  form_instances_form index exists"); }
  try { await sql`CREATE INDEX IF NOT EXISTS "form_instances_task_idx" ON "form_instances" ("task_id") WHERE "task_id" IS NOT NULL`; } catch { console.log("⏭️  form_instances_task index exists"); }
  try { await sql`CREATE INDEX IF NOT EXISTS "form_submissions_instance_idx" ON "form_submissions" ("instance_id")`; } catch { console.log("⏭️  form_submissions_instance index exists"); }
  try { await sql`CREATE INDEX IF NOT EXISTS "form_submissions_form_idx" ON "form_submissions" ("form_id")`; } catch { console.log("⏭️  form_submissions_form index exists"); }
  console.log("✅ Indexes created");

  console.log("\n✅ Migration 0041 complete!");
}

main().catch(console.error);
