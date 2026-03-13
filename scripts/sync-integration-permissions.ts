/**
 * Script to sync integration permissions into the database.
 * Run this AFTER applying migrations 0047-0048 and BEFORE deploying.
 * 
 * This ensures:
 * 1. integrations:read and integrations:manage permissions exist
 * 2. Roles have the correct integration permissions assigned
 * 
 * Usage: npx tsx scripts/sync-integration-permissions.ts
 */

import { neon } from "@neondatabase/serverless";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  console.log("🔄 Syncing integration permissions...\n");

  // 1. Ensure permissions exist
  const permsToCreate = [
    { name: "Ver integraciones", slug: "integrations:read", resource: "integrations", action: "read" },
    { name: "Gestionar integraciones", slug: "integrations:manage", resource: "integrations", action: "manage" },
  ];

  for (const perm of permsToCreate) {
    const existing = await sql`SELECT id FROM permissions WHERE slug = ${perm.slug}`;
    if (existing.length === 0) {
      await sql`INSERT INTO permissions (name, slug, resource, action) VALUES (${perm.name}, ${perm.slug}, ${perm.resource}, ${perm.action})`;
      console.log(`  ✅ Created permission: ${perm.slug}`);
    } else {
      console.log(`  ⏭️  Permission already exists: ${perm.slug}`);
    }
  }

  // 2. Assign permissions to roles
  const rolePermMap: Record<string, string[]> = {
    planner: ["integrations:read"],
    accountant: ["integrations:read"],
    provider_admin: ["integrations:read", "integrations:manage"],
  };

  for (const [roleSlug, permSlugs] of Object.entries(rolePermMap)) {
    const roleResult = await sql`SELECT id FROM roles WHERE slug = ${roleSlug} AND organization_id IS NULL LIMIT 1`;
    if (roleResult.length === 0) {
      console.log(`  ⚠️  Role not found: ${roleSlug}`);
      continue;
    }
    const roleId = roleResult[0].id;

    for (const permSlug of permSlugs) {
      const permResult = await sql`SELECT id FROM permissions WHERE slug = ${permSlug} LIMIT 1`;
      if (permResult.length === 0) continue;
      const permId = permResult[0].id;

      const existing = await sql`SELECT role_id FROM role_permissions WHERE role_id = ${roleId} AND permission_id = ${permId}`;
      if (existing.length === 0) {
        await sql`INSERT INTO role_permissions (role_id, permission_id) VALUES (${roleId}, ${permId})`;
        console.log(`  ✅ Assigned ${permSlug} to ${roleSlug}`);
      } else {
        console.log(`  ⏭️  ${roleSlug} already has ${permSlug}`);
      }
    }
  }

  console.log("\n✅ Integration permissions synced successfully!");
  console.log("\nNote: owner, admin, provider_owner have permission bypass — no explicit assignment needed.");
}

main().catch(console.error);
