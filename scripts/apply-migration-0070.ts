import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Migration 0070: onboarding_nudge_log table ===");

  await sql`
    CREATE TABLE IF NOT EXISTS onboarding_nudge_log (
      id              serial PRIMARY KEY,
      organization_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      nudge_type      text    NOT NULL,
      sent_at         timestamp DEFAULT now(),
      UNIQUE (organization_id, nudge_type)
    )
  `;
  console.log("  ✓ Tabla onboarding_nudge_log creada");

  console.log("\n✅ Migration 0070 applied successfully!");
}

main().catch((err) => {
  console.error("Migration 0070 FAILED:", err);
  process.exit(1);
});
