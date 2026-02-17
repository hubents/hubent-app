import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function verify() {
  const sql = neon(process.env.DATABASE_URL!);
  const email = process.argv[2] || "gimenez.ger@gmail.com";

  console.log(`\n🔍 Simulating getUserOrganizations for: ${email}\n`);

  // 1. Find user
  const users = await sql`SELECT id, name, email FROM users WHERE email = ${email}`;
  if (users.length === 0) {
    console.log("❌ User NOT found!");
    process.exit(1);
  }
  const user = users[0];
  console.log(`User: ${user.id} - ${user.name}`);

  // 2. Simulate the exact query from getUserOrganizations
  console.log("\n=== getUserOrganizations query ===");
  try {
    const orgs = await sql`
      SELECT 
        o.id,
        o.name,
        o.slug,
        o.logo,
        o.status,
        o.org_type,
        r.slug as role,
        r.name as role_name
      FROM organization_members om
      INNER JOIN organizations o ON o.id = om.organization_id
      INNER JOIN roles r ON r.id = om.role_id
      WHERE om.user_id = ${user.id}
    `;
    console.log(`✅ Query succeeded! Found ${orgs.length} orgs:`);
    for (const o of orgs) {
      console.log(`  - ${o.name} (${o.slug}) | role: ${o.role} | org_type: ${o.org_type}`);
    }
  } catch (e: any) {
    console.log(`❌ Query FAILED: ${e.message}`);
  }

  // 3. Simulate buildUserContext impersonation query
  console.log("\n=== buildUserContext impersonation query ===");
  try {
    const orgs = await sql`
      SELECT id, name, slug, logo, status, org_type
      FROM organizations
      LIMIT 1
    `;
    console.log(`✅ Query succeeded! org_type = ${orgs[0]?.org_type}`);
  } catch (e: any) {
    console.log(`❌ Query FAILED: ${e.message}`);
  }

  // 4. Check for other potentially missing columns referenced in schema
  console.log("\n=== Checking other schema columns ===");
  
  // Check verification_status on organizations (used in provider portal)
  const verCols = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name IN ('verification_status', 'provider_description', 'provider_services')
  `;
  console.log(`Provider columns on organizations: ${verCols.map((c: any) => c.column_name).join(', ') || 'NONE'}`);

  // Check feature_flags table exists
  const ffTable = await sql`
    SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_flags'
  `;
  console.log(`feature_flags table: ${ffTable.length > 0 ? '✅ exists' : '❌ MISSING'}`);

  // Check subscriptions table exists  
  const subTable = await sql`
    SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions'
  `;
  console.log(`subscriptions table: ${subTable.length > 0 ? '✅ exists' : '❌ MISSING'}`);

  // Check subscription_plans table and org_type column
  const spTable = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'subscription_plans'
    ORDER BY ordinal_position
  `;
  console.log(`subscription_plans columns: ${spTable.map((c: any) => c.column_name).join(', ')}`);

  console.log("\n✅ Verification complete\n");
  process.exit(0);
}

verify().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
