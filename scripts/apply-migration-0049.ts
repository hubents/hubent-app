import { Pool } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  const migrationPath = path.join(__dirname, "..", "drizzle", "0049_add_composio_triggers_and_whatsapp_inbound.sql");
  const sql = fs.readFileSync(migrationPath, "utf-8");

  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  console.log(`Applying migration 0049 (${statements.length} statements)...`);

  for (const stmt of statements) {
    try {
      await pool.query(stmt);
      console.log("✓", stmt.slice(0, 80).replace(/\n/g, " "));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists")) {
        console.log("⏭ Already exists:", stmt.slice(0, 60).replace(/\n/g, " "));
      } else {
        console.error("✗ Error:", msg);
        console.error("  Statement:", stmt.slice(0, 120));
      }
    }
  }

  await pool.end();
  console.log("Migration 0049 complete.");
}

main().catch(console.error);
