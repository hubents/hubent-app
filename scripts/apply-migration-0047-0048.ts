import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";

async function applyMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  const migrations = [
    "0047_add_organization_integrations.sql",
    "0048_add_email_whatsapp_to_task_messages.sql",
  ];

  for (const migration of migrations) {
    const filePath = path.join(__dirname, "..", "drizzle", migration);
    const content = fs.readFileSync(filePath, "utf-8");
    
    console.log(`\nApplying ${migration}...`);
    
    const statements = content
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      try {
        await sql`${statement}`;
        console.log(`  ✅ ${statement.substring(0, 60)}...`);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("already exists")) {
          console.log(`  ⏭️  Already exists, skipping: ${statement.substring(0, 60)}...`);
        } else {
          console.error(`  ❌ Error: ${msg}`);
          console.error(`  Statement: ${statement}`);
        }
      }
    }
  }

  console.log("\n✅ All migrations applied!");
}

applyMigrations().catch(console.error);
