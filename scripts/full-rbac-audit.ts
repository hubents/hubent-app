/**
 * Full RBAC Audit Script
 * Checks all users, roles, permissions, collaborators, and provider sync
 * Run: npx tsx scripts/full-rbac-audit.ts
 */
import "dotenv/config";
import { db } from "../src/db";
import {
  users,
  organizations,
  organizationMembers,
  roles,
  rolePermissions,
  permissions,
  eventParticipants,
  events,
  providerEventAccess,
  platformAdmins,
} from "../src/db/schema";
import { eq, and, isNull, count, sql, inArray, isNotNull } from "drizzle-orm";

// Canonical permission matrix from system-init.ts
const CANONICAL_MAP: Record<string, string[]> = {
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

// Bypass roles (owner, admin, provider_owner) — no rolePermissions needed
const BYPASS_ROLES = ["owner", "admin", "provider_owner"];

// eventScoped roles
const EVENT_SCOPED_ROLES = ["assistant", "viewer", "client"];

interface AuditIssue {
  severity: "CRITICAL" | "WARNING" | "INFO";
  category: string;
  message: string;
  details?: string;
}

async function runAudit() {
  const issues: AuditIssue[] = [];

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║         FULL RBAC AUDIT — HubEnts           ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // ============================================
  // 1. AUDIT SYSTEM ROLES
  // ============================================
  console.log("━━━ 1. SYSTEM ROLES ━━━");
  const allRoles = await db.select().from(roles);
  const systemRoles = allRoles.filter((r) => r.isSystem);
  const customRoles = allRoles.filter((r) => !r.isSystem);

  console.log(`  System roles: ${systemRoles.length}`);
  for (const r of systemRoles) {
    const esLabel = r.eventScoped ? " [eventScoped]" : "";
    console.log(`    - ${r.slug} (id:${r.id}, orgId:${r.organizationId ?? "global"})${esLabel}`);

    // Check eventScoped flag matches expected
    if (EVENT_SCOPED_ROLES.includes(r.slug) && !r.eventScoped) {
      issues.push({
        severity: "CRITICAL",
        category: "roles",
        message: `Role "${r.slug}" should be eventScoped but is NOT`,
        details: `roleId=${r.id}`,
      });
    }
    if (!EVENT_SCOPED_ROLES.includes(r.slug) && r.eventScoped && !r.slug.startsWith("provider_")) {
      issues.push({
        severity: "WARNING",
        category: "roles",
        message: `Role "${r.slug}" is eventScoped but shouldn't be (unless intentional)`,
        details: `roleId=${r.id}`,
      });
    }
  }

  console.log(`  Custom roles: ${customRoles.length}`);
  for (const r of customRoles) {
    console.log(`    - ${r.slug} (id:${r.id}, orgId:${r.organizationId})`);
  }

  // ============================================
  // 2. AUDIT PERMISSIONS
  // ============================================
  console.log("\n━━━ 2. PERMISSIONS ━━━");
  const allPerms = await db.select().from(permissions);
  console.log(`  Total permissions: ${allPerms.length}`);

  const expectedPerms = [
    "events:read", "events:create", "events:update", "events:delete",
    "tasks:read", "tasks:create", "tasks:update", "tasks:delete",
    "vendors:read", "vendors:create", "vendors:update", "vendors:delete",
    "team:read", "team:invite", "team:manage",
    "finance:read", "finance:create", "finance:manage",
    "crm:read", "crm:manage",
    "settings:read", "settings:update",
    "forms:read", "forms:create", "forms:update", "forms:delete",
  ];

  const existingSlugs = new Set(allPerms.map((p) => p.slug));
  for (const slug of expectedPerms) {
    if (!existingSlugs.has(slug)) {
      issues.push({
        severity: "CRITICAL",
        category: "permissions",
        message: `Missing permission: "${slug}"`,
      });
    }
  }

  // Check for extra permissions not in canonical list
  for (const p of allPerms) {
    if (!expectedPerms.includes(p.slug)) {
      issues.push({
        severity: "INFO",
        category: "permissions",
        message: `Extra permission not in canonical list: "${p.slug}"`,
        details: `id=${p.id}`,
      });
    }
  }

  // ============================================
  // 3. AUDIT ROLE-PERMISSION MAPPINGS
  // ============================================
  console.log("\n━━━ 3. ROLE-PERMISSION MAPPINGS ━━━");
  const permIdToSlug: Record<number, string> = {};
  for (const p of allPerms) permIdToSlug[p.id] = p.slug;

  for (const [roleSlug, expectedPermSlugs] of Object.entries(CANONICAL_MAP)) {
    // Find the system role (global, no orgId)
    const role = systemRoles.find((r) => r.slug === roleSlug && r.organizationId === null);
    if (!role) {
      issues.push({
        severity: "CRITICAL",
        category: "rolePermissions",
        message: `System role "${roleSlug}" not found (global)`,
      });
      continue;
    }

    const rp = await db
      .select({ permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, role.id));

    const actualSlugs = rp.map((r) => permIdToSlug[r.permissionId]).filter(Boolean);
    const missingPerms = expectedPermSlugs.filter((s) => !actualSlugs.includes(s));
    const extraPerms = actualSlugs.filter((s) => !expectedPermSlugs.includes(s));

    if (missingPerms.length > 0) {
      issues.push({
        severity: "CRITICAL",
        category: "rolePermissions",
        message: `Role "${roleSlug}" missing permissions: ${missingPerms.join(", ")}`,
      });
    }
    if (extraPerms.length > 0) {
      issues.push({
        severity: "WARNING",
        category: "rolePermissions",
        message: `Role "${roleSlug}" has extra permissions: ${extraPerms.join(", ")}`,
      });
    }

    const status = missingPerms.length === 0 && extraPerms.length === 0 ? "✅" : "⚠️";
    console.log(`  ${roleSlug}: ${actualSlugs.length} perms ${status}`);
    if (missingPerms.length) console.log(`    MISSING: ${missingPerms.join(", ")}`);
    if (extraPerms.length) console.log(`    EXTRA: ${extraPerms.join(", ")}`);
  }

  // Check bypass roles don't have unnecessary rolePermissions
  for (const bypassSlug of BYPASS_ROLES) {
    const role = systemRoles.find((r) => r.slug === bypassSlug && r.organizationId === null);
    if (role) {
      const rp = await db
        .select({ permissionId: rolePermissions.permissionId })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, role.id));
      if (rp.length > 0) {
        issues.push({
          severity: "INFO",
          category: "rolePermissions",
          message: `Bypass role "${bypassSlug}" has ${rp.length} explicit rolePermissions (unnecessary but harmless)`,
        });
      }
    }
  }

  // ============================================
  // 4. AUDIT ORGANIZATIONS
  // ============================================
  console.log("\n━━━ 4. ORGANIZATIONS ━━━");
  const allOrgs = await db.select().from(organizations);
  const tenantOrgs = allOrgs.filter((o) => o.orgType === "tenant" || !o.orgType);
  const providerOrgs = allOrgs.filter((o) => o.orgType === "provider");

  console.log(`  Tenant orgs: ${tenantOrgs.length}`);
  console.log(`  Provider orgs: ${providerOrgs.length}`);

  for (const org of allOrgs) {
    // Check org has an owner member
    const ownerMember = await db
      .select({ userId: organizationMembers.userId, roleSlug: roles.slug })
      .from(organizationMembers)
      .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
      .where(
        and(
          eq(organizationMembers.organizationId, org.id),
          eq(roles.slug, org.orgType === "provider" ? "provider_owner" : "owner")
        )
      );

    if (ownerMember.length === 0) {
      issues.push({
        severity: "CRITICAL",
        category: "organizations",
        message: `Org "${org.name}" (id:${org.id}, type:${org.orgType}) has NO owner member`,
        details: `ownerId=${org.ownerId}`,
      });
    }

    // Check ownerId matches a member
    if (org.ownerId) {
      const ownerAsMember = await db
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, org.id),
            eq(organizationMembers.userId, org.ownerId)
          )
        )
        .limit(1);

      if (ownerAsMember.length === 0) {
        issues.push({
          severity: "CRITICAL",
          category: "organizations",
          message: `Org "${org.name}" ownerId "${org.ownerId}" has no membership record`,
          details: `orgId=${org.id}`,
        });
      }
    }
  }

  // ============================================
  // 5. AUDIT ALL USERS & MEMBERSHIPS
  // ============================================
  console.log("\n━━━ 5. USERS & MEMBERSHIPS ━━━");
  const allUsers = await db.select().from(users);
  console.log(`  Total users: ${allUsers.length}`);

  // Platform admins
  const admins = await db.select().from(platformAdmins);
  console.log(`  Platform admins: ${admins.length}`);
  for (const a of admins) {
    console.log(`    - ${a.userId} (level: ${a.level})`);
  }

  let usersWithNoMembership = 0;
  let usersWithMultipleMemberships = 0;

  for (const user of allUsers) {
    const memberships = await db
      .select({
        orgId: organizationMembers.organizationId,
        orgName: organizations.name,
        orgType: organizations.orgType,
        roleSlug: roles.slug,
        roleName: roles.name,
        eventScoped: roles.eventScoped,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
      .where(eq(organizationMembers.userId, user.id));

    if (memberships.length === 0) {
      usersWithNoMembership++;
      issues.push({
        severity: "WARNING",
        category: "users",
        message: `User "${user.name || user.email}" has NO organization membership`,
        details: `userId=${user.id}, email=${user.email}`,
      });
    }

    if (memberships.length > 1) {
      usersWithMultipleMemberships++;
    }

    for (const m of memberships) {
      // Check role consistency with org type
      if (m.orgType === "provider" && !["provider_owner", "provider_admin", "provider_tech"].includes(m.roleSlug)) {
        issues.push({
          severity: "CRITICAL",
          category: "users",
          message: `User "${user.name || user.email}" in PROVIDER org "${m.orgName}" has TENANT role "${m.roleSlug}"`,
          details: `userId=${user.id}, orgId=${m.orgId}`,
        });
      }

      if (m.orgType === "tenant" && m.roleSlug.startsWith("provider_")) {
        issues.push({
          severity: "CRITICAL",
          category: "users",
          message: `User "${user.name || user.email}" in TENANT org "${m.orgName}" has PROVIDER role "${m.roleSlug}"`,
          details: `userId=${user.id}, orgId=${m.orgId}`,
        });
      }
    }

    // Print user summary
    const roleList = memberships.map((m) => `${m.orgName}/${m.roleSlug}${m.eventScoped ? "[ES]" : ""}`).join(", ");
    if (memberships.length > 0) {
      console.log(`  ${user.name || user.email} → ${roleList}`);
    }
  }

  console.log(`  Users with NO membership: ${usersWithNoMembership}`);
  console.log(`  Users with multiple memberships: ${usersWithMultipleMemberships}`);

  // ============================================
  // 6. AUDIT EVENT PARTICIPANTS (Collaborators)
  // ============================================
  console.log("\n━━━ 6. EVENT PARTICIPANTS (Collaborators) ━━━");
  const participants = await db
    .select({
      id: eventParticipants.id,
      eventId: eventParticipants.eventId,
      eventName: events.name,
      userId: eventParticipants.userId,
      contactId: eventParticipants.contactId,
      vendorId: eventParticipants.vendorId,
      type: eventParticipants.type,
      role: eventParticipants.role,
      permissions: eventParticipants.permissions,
    })
    .from(eventParticipants)
    .innerJoin(events, eq(eventParticipants.eventId, events.id));

  console.log(`  Total event participants: ${participants.length}`);

  const participantsByType: Record<string, number> = {};
  for (const p of participants) {
    participantsByType[p.type || "unknown"] = (participantsByType[p.type || "unknown"] || 0) + 1;

    // Check: userId participants should have valid memberships
    if (p.userId) {
      const event = await db.query.events.findFirst({
        where: eq(events.id, p.eventId),
        columns: { organizationId: true },
      });

      if (event) {
        const membership = await db
          .select({ id: organizationMembers.id })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.userId, p.userId),
              eq(organizationMembers.organizationId, event.organizationId)
            )
          )
          .limit(1);

        if (membership.length === 0) {
          issues.push({
            severity: "WARNING",
            category: "collaborators",
            message: `Event participant userId="${p.userId}" in event "${p.eventName}" has no org membership`,
            details: `participantId=${p.id}, eventId=${p.eventId}`,
          });
        }
      }
    }

    // Check permissions JSON structure
    if (p.permissions) {
      const perms = p.permissions as Record<string, string>;
      const validSections = ["general", "tasks", "guests", "rsvp", "vendors", "finances", "settings"];
      const validLevels = ["view", "edit", "none"];
      for (const [section, level] of Object.entries(perms)) {
        if (!validSections.includes(section)) {
          issues.push({
            severity: "WARNING",
            category: "collaborators",
            message: `Invalid section "${section}" in participant permissions`,
            details: `participantId=${p.id}, eventId=${p.eventId}`,
          });
        }
        if (!validLevels.includes(level as string)) {
          issues.push({
            severity: "WARNING",
            category: "collaborators",
            message: `Invalid level "${level}" for section "${section}" in participant permissions`,
            details: `participantId=${p.id}, eventId=${p.eventId}`,
          });
        }
      }
    }
  }

  for (const [type, cnt] of Object.entries(participantsByType)) {
    console.log(`    ${type}: ${cnt}`);
  }

  // ============================================
  // 7. AUDIT PROVIDER EVENT ACCESS
  // ============================================
  console.log("\n━━━ 7. PROVIDER EVENT ACCESS ━━━");
  const allAccess = await db
    .select({
      id: providerEventAccess.id,
      providerOrgId: providerEventAccess.providerOrgId,
      eventId: providerEventAccess.eventId,
      plannerOrgId: providerEventAccess.plannerOrgId,
      status: providerEventAccess.status,
    })
    .from(providerEventAccess);

  console.log(`  Total access records: ${allAccess.length}`);

  const accessByStatus: Record<string, number> = {};
  for (const a of allAccess) {
    accessByStatus[a.status || "null"] = (accessByStatus[a.status || "null"] || 0) + 1;

    // Check provider org is actually a provider
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, a.providerOrgId),
      columns: { orgType: true, name: true },
    });

    if (org && org.orgType !== "provider") {
      issues.push({
        severity: "CRITICAL",
        category: "providerAccess",
        message: `providerEventAccess record links to non-provider org "${org.name}" (type=${org.orgType})`,
        details: `accessId=${a.id}, providerOrgId=${a.providerOrgId}`,
      });
    }

    // Check for stale "pending" records (should be "active" after our auto-accept fix)
    if (a.status === "pending") {
      issues.push({
        severity: "WARNING",
        category: "providerAccess",
        message: `Provider access still "pending" (pre-fix record?)`,
        details: `accessId=${a.id}, providerOrgId=${a.providerOrgId}, eventId=${a.eventId}`,
      });
    }

    // Check for "accepted" (old bug value)
    if (a.status === "accepted") {
      issues.push({
        severity: "CRITICAL",
        category: "providerAccess",
        message: `Provider access has stale "accepted" status (should be "active")`,
        details: `accessId=${a.id}, providerOrgId=${a.providerOrgId}, eventId=${a.eventId}`,
      });
    }
  }

  for (const [status, cnt] of Object.entries(accessByStatus)) {
    console.log(`    ${status}: ${cnt}`);
  }

  // ============================================
  // 8. CROSS-CHECK: eventScoped users must be event_participants
  // ============================================
  console.log("\n━━━ 8. EVENT-SCOPED USER VALIDATION ━━━");
  const eventScopedMembers = await db
    .select({
      userId: organizationMembers.userId,
      orgId: organizationMembers.organizationId,
      orgName: organizations.name,
      roleSlug: roles.slug,
      userName: users.name,
      email: users.email,
    })
    .from(organizationMembers)
    .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(roles.eventScoped, true));

  console.log(`  EventScoped members: ${eventScopedMembers.length}`);

  for (const m of eventScopedMembers) {
    // Check how many events this user participates in
    const eventParts = await db
      .select({ eventId: eventParticipants.eventId })
      .from(eventParticipants)
      .innerJoin(events, eq(eventParticipants.eventId, events.id))
      .where(
        and(
          eq(eventParticipants.userId, m.userId),
          eq(events.organizationId, m.orgId)
        )
      );

    if (eventParts.length === 0) {
      issues.push({
        severity: "WARNING",
        category: "eventScoped",
        message: `EventScoped user "${m.userName || m.email}" (${m.roleSlug}) has NO event participations → will see empty dashboard`,
        details: `userId=${m.userId}, org=${m.orgName}`,
      });
    } else {
      console.log(`    ${m.userName || m.email} (${m.roleSlug}@${m.orgName}): ${eventParts.length} events`);
    }
  }

  // ============================================
  // 9. SUMMARY
  // ============================================
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║               AUDIT SUMMARY                 ║");
  console.log("╚══════════════════════════════════════════════╝");

  const critical = issues.filter((i) => i.severity === "CRITICAL");
  const warnings = issues.filter((i) => i.severity === "WARNING");
  const infos = issues.filter((i) => i.severity === "INFO");

  console.log(`\n  🔴 CRITICAL: ${critical.length}`);
  console.log(`  🟡 WARNING:  ${warnings.length}`);
  console.log(`  🔵 INFO:     ${infos.length}`);

  if (critical.length > 0) {
    console.log("\n── CRITICAL ISSUES ──");
    for (const i of critical) {
      console.log(`  [${i.category}] ${i.message}`);
      if (i.details) console.log(`    → ${i.details}`);
    }
  }

  if (warnings.length > 0) {
    console.log("\n── WARNINGS ──");
    for (const i of warnings) {
      console.log(`  [${i.category}] ${i.message}`);
      if (i.details) console.log(`    → ${i.details}`);
    }
  }

  if (infos.length > 0) {
    console.log("\n── INFO ──");
    for (const i of infos) {
      console.log(`  [${i.category}] ${i.message}`);
      if (i.details) console.log(`    → ${i.details}`);
    }
  }

  console.log("\n━━━ AUDIT COMPLETE ━━━\n");
  process.exit(issues.some((i) => i.severity === "CRITICAL") ? 1 : 0);
}

runAudit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(2);
});
