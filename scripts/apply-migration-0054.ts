import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Creating task_template_forms table...");
  await sql`
    CREATE TABLE IF NOT EXISTS "task_template_forms" (
      "id" serial PRIMARY KEY NOT NULL,
      "task_template_id" integer NOT NULL REFERENCES "task_templates"("id") ON DELETE CASCADE,
      "form_id" integer NOT NULL REFERENCES "forms"("id") ON DELETE CASCADE,
      "sort_order" integer DEFAULT 0
    )
  `;

  console.log("Migration 0054 applied successfully!");
}

main().catch(console.error);
