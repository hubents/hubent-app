import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  
  console.log("=== organizations columns ===");
  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'organizations'
    ORDER BY ordinal_position
  `;
  for (const c of cols) {
    console.log(`  ${c.column_name} (${c.data_type})`);
  }

  console.log("\n=== organization_members columns ===");
  const memCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'organization_members'
    ORDER BY ordinal_position
  `;
  for (const c of memCols) {
    console.log(`  ${c.column_name} (${c.data_type})`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
