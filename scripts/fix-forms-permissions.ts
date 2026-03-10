/**
 * Fix Forms Permissions — Idempotent script
 * Ensures forms permissions exist and are assigned to the correct roles.
 *
 * Permission matrix:
 * - planner: forms:read, forms:create, forms:update, forms:delete
 * - assistant: forms:read (eventScoped, only assigned events)
 * - viewer: forms:read (eventScoped, only assigned events)
 * - client: forms:read (eventScoped, only their tasks)
 * - provider_owner: forms:read (only assigned forms via providerEventAccess)
 * - provider_admin: forms:read
 * - provider_tech: forms:read
 *
 * owner/admin bypass permissions via requirePermission() logic.
 *
 * Usage: npx tsx scripts/fix-forms-permissions.ts
 */

import "dotenv/config";
import { db } from "../src/db";
import { roles, permissions, rolePermissions } from "../src/db/schema";
import { eq } from "drizzle-orm";

const FORMS_PERMISSIONS = [
  { name: "Ver formularios", slug: "forms:read", resource: "forms", action: "read" },
  { name: "Crear formularios", slug: "forms:create", resource: "forms", action: "create" },
  { name: "Editar formularios", slug: "forms:update", resource: "forms", action: "update" },
  { name: "Eliminar formularios", slug: "forms:delete", resource: "forms", action: "delete" },
];

const ROLE_FORMS_PERMISSIONS: Record<string, string[]> = {
  planner: ["forms:read", "forms:create", "forms:update", "forms:delete"],
  assistant: ["forms:read"],
  viewer: ["forms:read"],
  client: ["forms:read"],
  provider_owner: ["forms:read"],
  provider_admin: ["forms:read"],
  provider_tech: ["forms:read"],
};

async function main() {
  console.log("🔧 Fixing forms permissions...\n");

  // Step 1: Ensure permissions exist
  console.log("--- Step 1: Ensure forms permissions exist ---");
  for (const perm of FORMS_PERMISSIONS) {
    const existing = await db.query.permissions.findFirst({
      where: eq(permissions.slug, perm.slug),
    });
    if (!existing) {
      await db.insert(permissions).values(perm);
      console.log(`  ✅ Created permission: ${perm.slug}`);
    } else {
      console.log(`  ⏭️  Already exists: ${perm.slug}`);
    }
  }

  // Step 2: Load all permissions
  const allPerms = await db.select({ id: permissions.id, slug: permissions.slug }).from(permissions);
  const permMap = new Map(allPerms.map(p => [p.slug, p.id]));
  console.log(`\nFound ${allPerms.length} permissions in DB\n`);

  // Step 3: Assign permissions to roles
  console.log("--- Step 2: Assign forms permissions to roles ---");
  for (const [roleSlug, permSlugs] of Object.entries(ROLE_FORMS_PERMISSIONS)) {
    const role = await db.query.roles.findFirst({
      where: eq(roles.slug, roleSlug),
    });

    if (!role) {
      console.log(`  ⚠️  Role "${roleSlug}" not found, skipping`);
      continue;
    }

    let added = 0;
    for (const permSlug of permSlugs) {
      const permId = permMap.get(permSlug);
      if (!permId) {
        console.log(`  ⚠️  Permission "${permSlug}" not found`);
        continue;
      }

      try {
        await db.insert(rolePermissions).values({
          roleId: role.id,
          permissionId: permId,
        }).onConflictDoNothing();
        added++;
      } catch {
        // Already exists
      }
    }

    console.log(`  ✅ ${roleSlug}: ${added} permissions ensured (${permSlugs.join(", ")})`);
  }

  console.log("\n🎉 Done! Forms permissions configured.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
