import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  
  console.log("Checking tasks table columns...\n");
  
  const columns = await sql`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'tasks'
    ORDER BY ordinal_position
  `;
  
  console.log("Columns in tasks table:");
  columns.forEach((col: any) => {
    console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
  });
  
  // Check if updated_at exists
  const hasUpdatedAt = columns.some((col: any) => col.column_name === 'updated_at');
  console.log(`\nupdated_at column exists: ${hasUpdatedAt}`);
  
  // Try a simple query
  console.log("\nTrying simple tasks query...");
  try {
    const tasks = await sql`SELECT id, title, organization_id FROM tasks LIMIT 1`;
    console.log("Simple query works:", tasks);
  } catch (e) {
    console.error("Simple query failed:", e);
  }
  
  // Try query with all columns
  console.log("\nTrying full tasks query...");
  try {
    const tasks = await sql`SELECT * FROM tasks LIMIT 1`;
    console.log("Full query works, columns:", Object.keys(tasks[0] || {}));
  } catch (e) {
    console.error("Full query failed:", e);
  }
}

main().catch(console.error);
