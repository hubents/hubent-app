import fs from "fs";
import dotenv from "dotenv";
import { Pool } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local" });

const client = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();

  console.log("=== Applying migration 0055: Provider Marketplace Fields ===");
  const m55 = fs.readFileSync("./drizzle/0055_provider_marketplace_fields.sql", "utf-8");
  const blocks55 = splitSqlStatements(m55);
  for (const stmt of blocks55) {
    try {
      await client.query(stmt);
      console.log("OK:", stmt.substring(0, 70).replace(/\n/g, " ") + "...");
    } catch (e) {
      console.log("WARN:", e.message.substring(0, 100));
    }
  }

  console.log("\n=== Applying migration 0056: Marketplace Favorites ===");
  const m56 = fs.readFileSync("./drizzle/0056_marketplace_favorites.sql", "utf-8");
  const blocks56 = splitSqlStatements(m56);
  for (const stmt of blocks56) {
    try {
      await client.query(stmt);
      console.log("OK:", stmt.substring(0, 70).replace(/\n/g, " ") + "...");
    } catch (e) {
      console.log("WARN:", e.message.substring(0, 100));
    }
  }

  // Verify
  console.log("\n=== Verification ===");
  const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='organizations' AND column_name IN ('description', 'tagline', 'cover_image', 'created_by_org_id', 'profile_completeness', 'city') ORDER BY column_name");
  console.log("New org columns:", cols.rows.map((c) => c.column_name));

  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name IN ('provider_favorites', 'organization_portfolio', 'provider_invitations') ORDER BY table_name");
  console.log("New tables:", tables.rows.map((t) => t.table_name));

  const userCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name IN ('phone', 'bio', 'job_title') ORDER BY column_name");
  console.log("New user columns:", userCols.rows.map((c) => c.column_name));

  await client.end();
  process.exit(0);
}

function splitSqlStatements(content) {
  const results = [];
  let current = "";
  let inDollarBlock = false;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--") && !inDollarBlock) continue;
    if (trimmed.length === 0 && !inDollarBlock) continue;

    // Detect DO $$ blocks
    if (trimmed.includes("DO $$")) {
      inDollarBlock = true;
      current += line + "\n";
      continue;
    }
    if (inDollarBlock) {
      current += line + "\n";
      if (trimmed.includes("END $$;")) {
        results.push(current.trim());
        current = "";
        inDollarBlock = false;
      }
      continue;
    }

    current += line + "\n";
    if (trimmed.endsWith(";")) {
      const stmt = current.trim();
      if (stmt.length > 1) {
        results.push(stmt);
      }
      current = "";
    }
  }

  if (current.trim().length > 1) {
    results.push(current.trim());
  }

  return results;
}

run().catch(console.error);
