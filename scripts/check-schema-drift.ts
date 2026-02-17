import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function check() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("\n🔍 Checking for schema drift (Drizzle vs actual DB)\n");

  // Tables and columns that tenant.ts references
  const criticalChecks = [
    { table: "organizations", columns: ["id", "name", "slug", "logo", "status", "org_type", "owner_id", "plan_id"] },
    { table: "organization_members", columns: ["id", "organization_id", "user_id", "role_id"] },
    { table: "roles", columns: ["id", "slug", "name"] },
    { table: "permissions", columns: ["id", "slug"] },
    { table: "role_permissions", columns: ["id", "role_id", "permission_id"] },
    { table: "platform_admins", columns: ["id", "user_id", "level"] },
    { table: "subscriptions", columns: ["id", "organization_id", "plan_id", "status"] },
    { table: "subscription_plans", columns: ["id", "slug", "name", "features", "limits"] },
    { table: "feature_flags", columns: ["id", "key", "enabled", "plan_ids"] },
    { table: "users", columns: ["id", "email", "name"] },
  ];

  let issues = 0;

  for (const check of criticalChecks) {
    // Check table exists
    const tableExists = await sql`
      SELECT 1 FROM information_schema.tables WHERE table_name = ${check.table}
    `;
    
    if (tableExists.length === 0) {
      console.log(`❌ TABLE MISSING: ${check.table}`);
      issues++;
      continue;
    }

    // Check columns exist
    const cols = await sql`
      SELECT column_name FROM information_schema.columns WHERE table_name = ${check.table}
    `;
    const colNames = cols.map((c: any) => c.column_name);
    
    const missing = check.columns.filter(c => !colNames.includes(c));
    if (missing.length > 0) {
      console.log(`⚠️  ${check.table}: missing columns: ${missing.join(", ")}`);
      issues++;
    } else {
      console.log(`✅ ${check.table}: all critical columns present`);
    }
  }

  console.log(`\n${issues === 0 ? "✅ No schema drift issues found!" : `⚠️  Found ${issues} issue(s)`}\n`);
  process.exit(0);
}

check().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
