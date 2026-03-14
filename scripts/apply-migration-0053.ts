import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Adding crm_create_contact column...");
  await sql`ALTER TABLE forms ADD COLUMN IF NOT EXISTS crm_create_contact boolean DEFAULT true`;

  console.log("Adding crm_create_lead column...");
  await sql`ALTER TABLE forms ADD COLUMN IF NOT EXISTS crm_create_lead boolean DEFAULT true`;

  console.log("Migration 0053 applied successfully!");
}

main().catch(console.error);
