/**
 * repair-rbac-data.ts
 * 
 * Fixes ALL issues found by full-rbac-audit.ts:
 * 1. Creates missing permission "settings:update"
 * 2. Runs hard-reset on ALL role→permission mappings (canonical)
 * 3. Fixes provider orgs with tenant "owner" role → provider_owner
 * 4. Fixes provider_admin/provider_tech roles that aren't global
 * 5. Cleans up extra permissions from roles (client, etc.)
 * 
 * Run: npx tsx scripts/repair-rbac-data.ts
 */
import "dotenv/config";
import { db } from "../src/db";
import {
  roles,
  permissions,
  rolePermissions,
  organizations,
  organizationMembers,
} from "../src/db/schema";
import { eq, and, isNull, inArray, notInArray } from "drizzle-orm";

const CANONICAL_PERMISSIONS = [
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

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
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

async function repair() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║       RBAC DATA REPAIR — HubEnts            ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // ============================================
  // STEP 1: Ensure all canonical permissions exist
  // ============================================
  console.log("━━━ Step 1: Ensure canonical permissions ━━━");
  const existingPerms = await db.select().from(permissions);
  const existingSlugs = new Set(existingPerms.map((p) => p.slug));

  for (const perm of CANONICAL_PERMISSIONS) {
    if (!existingSlugs.has(perm.slug)) {
      await db.insert(permissions).values(perm);
      console.log(`  ✅ Created permission: ${perm.slug}`);
    }
  }

  // Refresh after insert
  const allPerms = await db.select().from(permissions);
  const permIdBySlug: Record<string, number> = {};
  for (const p of allPerms) permIdBySlug[p.slug] = p.id;
  console.log(`  Total permissions: ${allPerms.length}\n`);

  // ============================================
  // STEP 2: Fix provider roles that aren't global
  // ============================================
  console.log("━━━ Step 2: Fix provider roles (ensure global) ━━━");
  const providerRoleSlugs = ["provider_owner", "provider_admin", "provider_tech"];

  for (const slug of providerRoleSlugs) {
    const globalRole = await db.query.roles.findFirst({
      where: and(eq(roles.slug, slug), isNull(roles.organizationId)),
    });

    if (!globalRole) {
      // Check if there's an org-scoped version
      const orgRole = await db.query.roles.findFirst({
        where: eq(roles.slug, slug),
      });

      if (orgRole) {
        // Make it global by removing organizationId
        await db.update(roles)
          .set({ organizationId: null })
          .where(eq(roles.id, orgRole.id));
        console.log(`  ✅ Made role "${slug}" global (was orgId=${orgRole.organizationId})`);
      } else {
        // Create it
        const desc = slug === "provider_owner" ? "Dueño de la organización proveedora"
          : slug === "provider_admin" ? "Administrador del proveedor"
          : "Técnico del proveedor";
        await db.insert(roles).values({
          name: slug.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          slug,
          description: desc,
          isSystem: true,
        });
        console.log(`  ✅ Created global role: ${slug}`);
      }
    } else {
      console.log(`  ⏭️ Role "${slug}" already global (id=${globalRole.id})`);
    }
  }

  // ============================================
  // STEP 3: Hard reset role→permission mappings
  // ============================================
  console.log("\n━━━ Step 3: Hard reset role→permission mappings ━━━");

  // Refresh roles
  const allRoles = await db.select().from(roles);

  for (const [roleSlug, expectedSlugs] of Object.entries(ROLE_PERMISSION_MAP)) {
    const role = allRoles.find((r) => r.slug === roleSlug && r.organizationId === null);
    if (!role) {
      console.log(`  ⚠️ Role "${roleSlug}" not found (global) — skipping`);
      continue;
    }

    // Delete ALL existing rolePermissions for this role
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));

    // Insert canonical set
    const toInsert = expectedSlugs
      .map((slug) => permIdBySlug[slug])
      .filter((id): id is number => id !== undefined);

    if (toInsert.length > 0) {
      await db.insert(rolePermissions).values(
        toInsert.map((permissionId) => ({ roleId: role.id, permissionId }))
      );
    }

    console.log(`  ✅ ${roleSlug}: reset to ${toInsert.length} permissions`);
  }

  // Clean bypass roles (owner, admin, provider_owner) — remove unnecessary rolePermissions
  for (const bypassSlug of ["owner", "admin", "provider_owner"]) {
    const role = allRoles.find((r) => r.slug === bypassSlug && r.organizationId === null);
    if (role) {
      const deleted = await db.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id)).returning();
      if (deleted.length > 0) {
        console.log(`  🧹 Cleaned ${deleted.length} unnecessary rolePermissions from "${bypassSlug}"`);
      }
    }
  }

  // ============================================
  // STEP 4: Fix provider org members with tenant "owner" role
  // ============================================
  console.log("\n━━━ Step 4: Fix provider org members with tenant roles ━━━");

  const providerOrgs = await db
    .select({ id: organizations.id, name: organizations.name, ownerId: organizations.ownerId })
    .from(organizations)
    .where(eq(organizations.orgType, "provider"));

  const providerOwnerRole = allRoles.find((r) => r.slug === "provider_owner" && r.organizationId === null)
    || (await db.query.roles.findFirst({ where: and(eq(roles.slug, "provider_owner"), isNull(roles.organizationId)) }));

  const tenantOwnerRole = allRoles.find((r) => r.slug === "owner" && r.organizationId === null);

  if (providerOwnerRole && tenantOwnerRole) {
    for (const org of providerOrgs) {
      // Find members with tenant "owner" role
      const badMembers = await db
        .select({ id: organizationMembers.id, userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, org.id),
            eq(organizationMembers.roleId, tenantOwnerRole.id)
          )
        );

      for (const m of badMembers) {
        await db.update(organizationMembers)
          .set({ roleId: providerOwnerRole.id })
          .where(eq(organizationMembers.id, m.id));
        console.log(`  ✅ ${org.name}: user ${m.userId} → provider_owner (was tenant owner)`);
      }

      // Also check for any tenant admin/planner etc in provider orgs
      const tenantRoleIds = allRoles
        .filter((r) => !r.slug.startsWith("provider_") && r.organizationId === null && r.slug !== "super_admin")
        .map((r) => r.id);

      if (tenantRoleIds.length > 0) {
        const otherBadMembers = await db
          .select({ id: organizationMembers.id, userId: organizationMembers.userId, roleId: organizationMembers.roleId })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, org.id),
              inArray(organizationMembers.roleId, tenantRoleIds)
            )
          );

        for (const m of otherBadMembers) {
          const currentRole = allRoles.find((r) => r.id === m.roleId);
          // Map tenant role to closest provider equivalent
          const targetSlug = currentRole?.slug === "admin" ? "provider_admin" : "provider_owner";
          const targetRole = allRoles.find((r) => r.slug === targetSlug && r.organizationId === null)
            || (await db.query.roles.findFirst({ where: and(eq(roles.slug, targetSlug), isNull(roles.organizationId)) }));

          if (targetRole) {
            await db.update(organizationMembers)
              .set({ roleId: targetRole.id })
              .where(eq(organizationMembers.id, m.id));
            console.log(`  ✅ ${org.name}: user ${m.userId} → ${targetSlug} (was ${currentRole?.slug})`);
          }
        }
      }
    }
  } else {
    console.log("  ⚠️ Could not find provider_owner or owner roles — skipping");
  }

  // ============================================
  // STEP 5: Verify eventScoped flags
  // ============================================
  console.log("\n━━━ Step 5: Verify eventScoped flags ━━━");
  const eventScopedConfig: Record<string, boolean> = {
    owner: false,
    admin: false,
    planner: false,
    assistant: true,
    accountant: false,
    viewer: true,
    client: true,
    provider_owner: false,
    provider_admin: false,
    provider_tech: false,
  };

  for (const [slug, shouldBeScoped] of Object.entries(eventScopedConfig)) {
    const role = await db.query.roles.findFirst({
      where: and(eq(roles.slug, slug), isNull(roles.organizationId)),
    });
    if (role && role.eventScoped !== shouldBeScoped) {
      await db.update(roles)
        .set({ eventScoped: shouldBeScoped })
        .where(eq(roles.id, role.id));
      console.log(`  ✅ ${slug}: eventScoped ${role.eventScoped} → ${shouldBeScoped}`);
    }
  }

  // ============================================
  // DONE
  // ============================================
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║         REPAIR COMPLETE                     ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log("\nRun 'npx tsx scripts/full-rbac-audit.ts' to verify.\n");

  process.exit(0);
}

repair().catch((err) => {
  console.error("Repair failed:", err);
  process.exit(1);
});
