import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function verify() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("\n🔍 Verifying plan/subscription flow\n");

  // Check subscriptions columns
  console.log("=== subscriptions columns ===");
  const subCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'subscriptions'
    ORDER BY ordinal_position
  `;
  for (const c of subCols) {
    console.log(`  ${c.column_name} (${c.data_type})`);
  }

  // Check feature_flags columns
  console.log("\n=== feature_flags columns ===");
  const ffCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'feature_flags'
    ORDER BY ordinal_position
  `;
  for (const c of ffCols) {
    console.log(`  ${c.column_name} (${c.data_type})`);
  }

  // Check if plan_ids column exists in feature_flags (referenced as planIds in Drizzle)
  const planIdsCol = ffCols.find((c: any) => c.column_name === 'plan_ids');
  console.log(`\nfeature_flags.plan_ids: ${planIdsCol ? '✅ exists' : '❌ MISSING'}`);

  // Simulate getOrgPlanInfo for org 1
  console.log("\n=== Simulating getOrgPlanInfo ===");
  
  // Get first org
  const orgs = await sql`SELECT id, name, plan_id FROM organizations LIMIT 3`;
  for (const o of orgs) {
    console.log(`  Org ${o.id} (${o.name}): plan_id = ${o.plan_id}`);
  }

  // Check subscriptions
  const subs = await sql`SELECT * FROM subscriptions LIMIT 3`;
  console.log(`\n  Subscriptions count: ${subs.length}`);

  // Check feature flags  
  const flags = await sql`SELECT * FROM feature_flags LIMIT 3`;
  console.log(`  Feature flags count: ${flags.length}`);

  console.log("\n✅ Done\n");
  process.exit(0);
}

verify().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
