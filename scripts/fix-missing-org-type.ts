import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function fix() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("🔧 Fixing missing org_type column in organizations table\n");

  // 1. Check if enum exists
  console.log("Step 1: Check if org_type enum exists...");
  const enumCheck = await sql`
    SELECT 1 FROM pg_type WHERE typname = 'org_type'
  `;

  if (enumCheck.length === 0) {
    console.log("  Creating org_type enum...");
    await sql`CREATE TYPE org_type AS ENUM ('tenant', 'provider', 'client')`;
    console.log("  ✅ Enum created");
  } else {
    console.log("  ✅ Enum already exists");
  }

  // 2. Check if column exists
  console.log("\nStep 2: Check if org_type column exists on organizations...");
  const colCheck = await sql`
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'org_type'
  `;

  if (colCheck.length === 0) {
    console.log("  Adding org_type column...");
    await sql`ALTER TABLE organizations ADD COLUMN org_type org_type DEFAULT 'tenant'`;
    console.log("  ✅ Column added with default 'tenant'");
  } else {
    console.log("  ✅ Column already exists");
  }

  // 3. Check if org_type column exists on subscription_plans
  console.log("\nStep 3: Check if org_type column exists on subscription_plans...");
  const planColCheck = await sql`
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription_plans' AND column_name = 'org_type'
  `;

  if (planColCheck.length === 0) {
    console.log("  Adding org_type column to subscription_plans...");
    await sql`ALTER TABLE subscription_plans ADD COLUMN org_type org_type DEFAULT 'tenant'`;
    console.log("  ✅ Column added with default 'tenant'");
  } else {
    console.log("  ✅ Column already exists");
  }

  // 4. Verify
  console.log("\nStep 4: Verify...");
  const verify = await sql`
    SELECT id, name, slug, org_type 
    FROM organizations 
    LIMIT 5
  `;
  for (const o of verify) {
    console.log(`  Org: ${o.name} (${o.slug}) | org_type: ${o.org_type}`);
  }

  console.log("\n✅ Fix complete!\n");
  process.exit(0);
}

fix().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
