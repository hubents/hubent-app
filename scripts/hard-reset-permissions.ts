/**
 * hard-reset-permissions.ts
 * 
 * Idempotent script to reset ALL system role permissions to the canonical mapping.
 * Safe to re-run. Does NOT affect custom roles (organizationId != null).
 * 
 * Usage: npx tsx scripts/hard-reset-permissions.ts
 */

import { db } from "../src/db";
import { roles, permissions, rolePermissions } from "../src/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// ============================================
// CANONICAL PERMISSION SET (24 permisos)
// ============================================

const BASE_PERMISSIONS = [
  { name: "Ver eventos", slug: "events:read", resource: "events", action: "read" },
  { name: "Crear eventos", slug: "events:create", resource: "events", action: "create" },
  { name: "Editar eventos", slug: "events:update", resource: "events", action: "update" },
  { name: "Eliminar eventos", slug: "events:delete", resource: "events", action: "delete" },
  { name: "Ver tareas", slug: "tasks:read", resource: "tasks", action: "read" },
  { name: "Crear tareas", slug: "tasks:create", resource: "tasks", action: "create" },
  { name: "Editar tareas", slug: "tasks:update", resource: "tasks", action: "update" },
  { name: "Eliminar tareas", slug: "tasks:delete", resource: "tasks", action: "delete" },
  { name: "Ver proveedores", slug: "vendors:read", resource: "vendors", action: "read" },
  { name: "Crear proveedores", slug: "vendors:create", resource: "vendors", action: "create" },
  { name: "Editar proveedores", slug: "vendors:update", resource: "vendors", action: "update" },
  { name: "Eliminar proveedores", slug: "vendors:delete", resource: "vendors", action: "delete" },
  { name: "Ver equipo", slug: "team:read", resource: "team", action: "read" },
  { name: "Invitar miembros", slug: "team:invite", resource: "team", action: "invite" },
  { name: "Gestionar roles", slug: "team:manage", resource: "team", action: "manage" },
  { name: "Ver finanzas", slug: "finance:read", resource: "finance", action: "read" },
  { name: "Crear documentos financieros", slug: "finance:create", resource: "finance", action: "create" },
  { name: "Gestionar pagos", slug: "finance:manage", resource: "finance", action: "manage" },
  { name: "Ver CRM", slug: "crm:read", resource: "crm", action: "read" },
  { name: "Gestionar CRM", slug: "crm:manage", resource: "crm", action: "manage" },
  { name: "Ver configuración", slug: "settings:read", resource: "settings", action: "read" },
  { name: "Editar configuración", slug: "settings:update", resource: "settings", action: "update" },
  { name: "Ver formularios", slug: "forms:read", resource: "forms", action: "read" },
  { name: "Crear formularios", slug: "forms:create", resource: "forms", action: "create" },
  { name: "Editar formularios", slug: "forms:update", resource: "forms", action: "update" },
  { name: "Eliminar formularios", slug: "forms:delete", resource: "forms", action: "delete" },
];

// ============================================
// CANONICAL ROLE → PERMISSIONS MAPPING
// ============================================
// owner, admin, provider_owner have bypass — no rolePermissions needed

const ROLE_PERMISSIONS: Record<string, string[]> = {
  planner: [
    "events:read", "events:create", "events:update",
    "tasks:read", "tasks:create", "tasks:update", "tasks:delete",
    "vendors:read", "vendors:create", "vendors:update",
    "team:read",
    "finance:read",
    "crm:read", "crm:manage",
    "settings:read",
    "forms:read", "forms:create", "forms:update", "forms:delete",
  ],
  assistant: [
    "events:read",
    "tasks:read", "tasks:create", "tasks:update",
    "vendors:read",
    "forms:read",
  ],
  accountant: [
    "events:read",
    "vendors:read",
    "finance:read", "finance:create", "finance:manage",
    "crm:read",
    "settings:read",
  ],
  viewer: [
    "events:read",
    "tasks:read",
    "vendors:read",
    "finance:read",
    "forms:read",
  ],
  client: [
    "events:read",
    "tasks:read",
  ],
  provider_admin: [
    "events:read",
    "tasks:read", "tasks:create", "tasks:update",
    "vendors:read",
    "team:read",
    "finance:read", "finance:create", "finance:manage",
    "crm:read",
    "settings:read",
    "forms:read",
  ],
  provider_tech: [
    "events:read",
    "tasks:read", "tasks:update",
    "forms:read",
  ],
};

// Roles that should have eventScoped = true
const EVENT_SCOPED_ROLES = ["assistant", "viewer", "client"];

// ============================================
// MAIN
// ============================================

async function main() {
  console.log("=== HARD RESET PERMISSIONS ===\n");

  // Step 1: Ensure all 24 canonical permissions exist
  console.log("Step 1: Ensuring canonical permissions exist...");
  let permCreated = 0;
  let permExisting = 0;

  for (const perm of BASE_PERMISSIONS) {
    const existing = await db.query.permissions.findFirst({
      where: eq(permissions.slug, perm.slug),
    });
    if (!existing) {
      await db.insert(permissions).values(perm);
      console.log(`  + Created: ${perm.slug}`);
      permCreated++;
    } else {
      permExisting++;
    }
  }
  console.log(`  Permissions: ${permCreated} created, ${permExisting} already existed\n`);

  // Step 2: Build slug → id lookup
  const allPerms = await db.select({ id: permissions.id, slug: permissions.slug }).from(permissions);
  const permIdBySlug: Record<string, number> = {};
  for (const p of allPerms) {
    permIdBySlug[p.slug] = p.id;
  }

  // Step 3: For each system role in ROLE_PERMISSIONS, reset rolePermissions
  console.log("Step 2: Resetting role permissions...");

  for (const [roleSlug, permSlugs] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await db.query.roles.findFirst({
      where: and(eq(roles.slug, roleSlug), isNull(roles.organizationId)),
    });

    if (!role) {
      console.log(`  ⚠ Role "${roleSlug}" not found — skipping`);
      continue;
    }

    // Delete existing rolePermissions for this system role
    const deleted = await db
      .delete(rolePermissions)
      .where(eq(rolePermissions.roleId, role.id))
      .returning();

    // Insert canonical permissions
    const permIds = permSlugs
      .map((slug) => permIdBySlug[slug])
      .filter((id): id is number => id !== undefined);

    if (permIds.length > 0) {
      await db.insert(rolePermissions).values(
        permIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        }))
      );
    }

    console.log(`  ✓ ${roleSlug}: deleted ${deleted.length} old → inserted ${permIds.length} canonical`);

    // Warn about missing permission slugs
    const missing = permSlugs.filter((slug) => !permIdBySlug[slug]);
    if (missing.length > 0) {
      console.log(`    ⚠ Missing permission slugs: ${missing.join(", ")}`);
    }
  }

  // Step 4: Ensure eventScoped flags are correct
  console.log("\nStep 3: Ensuring eventScoped flags...");

  for (const roleSlug of EVENT_SCOPED_ROLES) {
    const role = await db.query.roles.findFirst({
      where: and(eq(roles.slug, roleSlug), isNull(roles.organizationId)),
    });

    if (!role) {
      console.log(`  ⚠ Role "${roleSlug}" not found — skipping`);
      continue;
    }

    if (!role.eventScoped) {
      await db.update(roles).set({ eventScoped: true }).where(eq(roles.id, role.id));
      console.log(`  ✓ ${roleSlug}: set eventScoped = true`);
    } else {
      console.log(`  ✓ ${roleSlug}: already eventScoped`);
    }
  }

  // Step 5: Summary
  console.log("\n=== SUMMARY ===");
  console.log(`Permissions in DB: ${allPerms.length}`);
  console.log(`Roles updated: ${Object.keys(ROLE_PERMISSIONS).length}`);
  console.log(`EventScoped roles: ${EVENT_SCOPED_ROLES.join(", ")}`);
  console.log("\nDone! Run diagnose-tenant-permissions.ts to verify.");

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
