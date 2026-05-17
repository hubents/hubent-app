import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Migration 0064: Add assigned_to to lead_todos ===");

  await sql`
    ALTER TABLE lead_todos
    ADD COLUMN IF NOT EXISTS assigned_to text REFERENCES users(id) ON DELETE SET NULL
  `;
  console.log("  ✓ Added lead_todos.assigned_to column");

  console.log("\n✅ Migration 0064 applied successfully!");
}

main().catch((err) => {
  console.error("Migration 0064 FAILED:", err);
  process.exit(1);
});
