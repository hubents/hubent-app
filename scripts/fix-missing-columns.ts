import "dotenv/config";
import { neon } from "@neondatabase/serverless";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function colExists(sql: any, table: string, col: string) {
  const r = await sql`
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = ${table} AND column_name = ${col}
  ` as Record<string, unknown>[];
  return r.length > 0;
}

async function fix() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("🔧 Fixing ALL missing columns\n");

  // === ORGANIZATIONS TABLE ===
  console.log("=== organizations ===");

  // 1. verification_status enum
  const vsEnum = await sql`SELECT 1 FROM pg_type WHERE typname = 'verification_status'`;
  if (vsEnum.length === 0) {
    console.log("  Creating verification_status enum...");
    await sql`CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected')`;
    console.log("  ✅ Enum created");
  }

  // 2. Provider-specific columns
  if (!(await colExists(sql, "organizations", "instagram_handle"))) {
    await sql`ALTER TABLE organizations ADD COLUMN instagram_handle text`;
    console.log("  ✅ instagram_handle added");
  } else console.log("  ✅ instagram_handle exists");

  if (!(await colExists(sql, "organizations", "service_radius"))) {
    await sql`ALTER TABLE organizations ADD COLUMN service_radius integer`;
    console.log("  ✅ service_radius added");
  } else console.log("  ✅ service_radius exists");

  if (!(await colExists(sql, "organizations", "service_areas"))) {
    await sql`ALTER TABLE organizations ADD COLUMN service_areas json`;
    console.log("  ✅ service_areas added");
  } else console.log("  ✅ service_areas exists");

  if (!(await colExists(sql, "organizations", "verification_status"))) {
    await sql`ALTER TABLE organizations ADD COLUMN verification_status verification_status DEFAULT 'unverified'`;
    console.log("  ✅ verification_status added");
  } else console.log("  ✅ verification_status exists");

  if (!(await colExists(sql, "organizations", "verified_at"))) {
    await sql`ALTER TABLE organizations ADD COLUMN verified_at timestamp`;
    console.log("  ✅ verified_at added");
  } else console.log("  ✅ verified_at exists");

  if (!(await colExists(sql, "organizations", "verified_by"))) {
    await sql`ALTER TABLE organizations ADD COLUMN verified_by text REFERENCES users(id)`;
    console.log("  ✅ verified_by added");
  } else console.log("  ✅ verified_by exists");

  if (!(await colExists(sql, "organizations", "rejection_reason"))) {
    await sql`ALTER TABLE organizations ADD COLUMN rejection_reason text`;
    console.log("  ✅ rejection_reason added");
  } else console.log("  ✅ rejection_reason exists");

  if (!(await colExists(sql, "organizations", "provider_category"))) {
    await sql`ALTER TABLE organizations ADD COLUMN provider_category text`;
    console.log("  ✅ provider_category added");
  } else console.log("  ✅ provider_category exists");

  // === SUBSCRIPTION_PLANS TABLE ===
  console.log("\n=== subscription_plans ===");

  if (!(await colExists(sql, "subscription_plans", "is_active"))) {
    await sql`ALTER TABLE subscription_plans ADD COLUMN is_active boolean DEFAULT true`;
    console.log("  ✅ is_active added");
  } else console.log("  ✅ is_active exists");

  if (!(await colExists(sql, "subscription_plans", "sort_order"))) {
    await sql`ALTER TABLE subscription_plans ADD COLUMN sort_order integer DEFAULT 0`;
    console.log("  ✅ sort_order added");
  } else console.log("  ✅ sort_order exists");

  // === ROLES TABLE ===
  console.log("\n=== roles ===");

  if (!(await colExists(sql, "roles", "is_system"))) {
    await sql`ALTER TABLE roles ADD COLUMN is_system boolean DEFAULT false`;
    console.log("  ✅ is_system added");
  } else console.log("  ✅ is_system exists");

  if (!(await colExists(sql, "roles", "description"))) {
    await sql`ALTER TABLE roles ADD COLUMN description text`;
    console.log("  ✅ description added");
  } else console.log("  ✅ description exists");

  // === VERIFY ===
  console.log("\n=== Final organizations columns ===");
  const finalCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'organizations'
    ORDER BY ordinal_position
  `;
  for (const c of finalCols) {
    console.log(`  ${c.column_name} (${c.data_type})`);
  }

  // === GIVE ALL TENANTS OWNER ACCESS ===
  console.log("\n=== Ensuring all org owners have owner role ===");
  const ownerRole = await sql`SELECT id FROM roles WHERE slug = 'owner' LIMIT 1`;
  if (ownerRole.length === 0) {
    console.log("  ❌ Owner role not found!");
  } else {
    const ownerRoleId = ownerRole[0].id;
    // Update all memberships to owner role
    const updated = await sql`
      UPDATE organization_members 
      SET role_id = ${ownerRoleId}
      WHERE role_id != ${ownerRoleId}
      RETURNING id
    `;
    console.log(`  ✅ Updated ${updated.length} memberships to owner role`);

    // Show current state
    const members = await sql`
      SELECT om.id, o.name as org_name, r.slug as role_slug, u.email
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      JOIN roles r ON r.id = om.role_id
      JOIN users u ON u.id = om.user_id
      ORDER BY o.name
    `;
    console.log(`\n  All memberships (${members.length}):`);
    for (const m of members) {
      console.log(`    ${m.email} → ${m.org_name} [${m.role_slug}]`);
    }
  }

  console.log("\n✅ All fixes complete!\n");
  process.exit(0);
}

fix().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
