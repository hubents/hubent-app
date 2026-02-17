import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function diagnose() {
  const sql = neon(process.env.DATABASE_URL!);
  const email = process.argv[2] || "gimenez.ger@gmail.com";

  console.log(`\n🔍 Diagnosing tenant permissions for: ${email}\n`);

  // 1. Find user
  console.log("=== 1. USER ===");
  const users = await sql`SELECT id, name, email FROM users WHERE email = ${email}`;
  if (users.length === 0) {
    console.log("❌ User NOT found!");
    process.exit(1);
  }
  const user = users[0];
  console.log(`✅ User found: ${user.id} - ${user.name} (${user.email})`);

  // 2. Organization memberships
  console.log("\n=== 2. ORGANIZATION MEMBERSHIPS ===");
  const memberships = await sql`
    SELECT 
      om.id as membership_id,
      om.organization_id,
      om.role_id,
      o.name as org_name,
      o.slug as org_slug,
      o.owner_id,
      o.status as org_status,
      r.slug as role_slug,
      r.name as role_name
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    LEFT JOIN roles r ON r.id = om.role_id
    WHERE om.user_id = ${user.id}
  `;
  if (memberships.length === 0) {
    console.log("❌ No memberships found!");
  } else {
    for (const m of memberships) {
      const isOwner = m.owner_id === user.id ? " [IS OWNER]" : "";
      console.log(`  Org: ${m.org_name} (${m.org_slug}) | Role: ${m.role_slug} (${m.role_name}) | RoleID: ${m.role_id} | OrgStatus: ${m.org_status}${isOwner}`);
    }
  }

  // 3. Owned organizations (even without membership)
  console.log("\n=== 3. OWNED ORGANIZATIONS ===");
  const ownedOrgs = await sql`
    SELECT id, name, slug, owner_id, status
    FROM organizations
    WHERE owner_id = ${user.id}
  `;
  if (ownedOrgs.length === 0) {
    console.log("  No owned organizations");
  } else {
    for (const o of ownedOrgs) {
      const hasMembership = memberships.some((m: any) => m.organization_id === o.id);
      console.log(`  Org: ${o.name} (${o.slug}) | Status: ${o.status} | Has Membership: ${hasMembership ? "✅" : "❌ MISSING"}`);
    }
  }

  // 4. All roles in system
  console.log("\n=== 4. SYSTEM ROLES ===");
  const roles = await sql`SELECT id, slug, name FROM roles ORDER BY id`;
  for (const r of roles) {
    console.log(`  ID: ${r.id} | ${r.slug} (${r.name})`);
  }

  // 5. Role permissions for user's roles
  console.log("\n=== 5. PERMISSIONS FOR USER'S ROLE(S) ===");
  const userRoleIds = [...new Set(memberships.map((m: any) => m.role_id))];
  for (const roleId of userRoleIds) {
    const roleName = memberships.find((m: any) => m.role_id === roleId)?.role_slug;
    const perms = await sql`
      SELECT p.slug, p.name
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ${roleId}
      ORDER BY p.slug
    `;
    console.log(`  Role "${roleName}" (ID: ${roleId}) has ${perms.length} permissions:`);
    for (const p of perms) {
      console.log(`    - ${p.slug} (${p.name})`);
    }
  }

  // 6. All permissions in system
  console.log("\n=== 6. ALL PERMISSIONS IN SYSTEM ===");
  const allPerms = await sql`SELECT id, slug, name FROM permissions ORDER BY slug`;
  console.log(`  Total: ${allPerms.length} permissions`);
  for (const p of allPerms) {
    console.log(`    ID: ${p.id} | ${p.slug} (${p.name})`);
  }

  // 7. Platform admin check
  console.log("\n=== 7. PLATFORM ADMIN ===");
  const platformAdmin = await sql`SELECT * FROM platform_admins WHERE user_id = ${user.id}`;
  if (platformAdmin.length > 0) {
    console.log(`  ✅ Platform admin level: ${platformAdmin[0].level}`);
  } else {
    console.log("  Not a platform admin");
  }

  // 8. Check hubents-org-id cookie scenario
  console.log("\n=== 8. SIDEBAR PERMISSION CHECK SIMULATION ===");
  const requiredPerms = ["events:read", "crm:read", "tasks:read", "finance:read", "team:read", "vendors:read", "settings:read"];
  for (const m of memberships) {
    console.log(`\n  For org "${m.org_name}" (role: ${m.role_slug}):`);
    
    // If owner/admin, all perms granted
    if (m.role_slug === "owner" || m.role_slug === "admin" || m.role_slug === "provider_owner") {
      console.log(`    ✅ Role "${m.role_slug}" has FULL ACCESS - all sidebar items visible`);
      continue;
    }
    
    // Check specific permissions
    const perms = await sql`
      SELECT p.slug
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ${m.role_id}
    `;
    const permSlugs = perms.map((p: any) => p.slug);
    
    for (const req of requiredPerms) {
      const has = permSlugs.includes(req);
      const [resource] = req.split(":");
      const hasWildcard = permSlugs.includes(`${resource}:*`);
      console.log(`    ${has || hasWildcard ? "✅" : "❌"} ${req} ${hasWildcard ? "(via wildcard)" : ""}`);
    }
  }

  console.log("\n✅ Diagnosis complete\n");
  process.exit(0);
}

diagnose().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
