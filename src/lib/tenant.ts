import { db } from "@/db";
import { 
  organizations, 
  organizationMembers, 
  roles, 
  rolePermissions, 
  permissions,
  platformAdmins,
  subscriptionPlans,
  subscriptions,
  featureFlags,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { TenantRole, OrgType, UserContext, TenantSession, PermissionCheck, PlanInfo } from "@/types";
import { getEventParticipant, getTaskParticipantAccess } from "@/lib/event-permissions";

// ============================================
// TENANT HELPERS
// ============================================

/**
 * Get user's membership in an organization
 */
export async function getUserMembership(userId: string, organizationId: number) {
  const membership = await db
    .select({
      id: organizationMembers.id,
      roleId: organizationMembers.roleId,
      roleName: roles.name,
      roleSlug: roles.slug,
      joinedAt: organizationMembers.joinedAt,
    })
    .from(organizationMembers)
    .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId)
      )
    )
    .limit(1);

  return membership[0] || null;
}

/**
 * Get all organizations a user belongs to
 * If user owns an org but has no membership, auto-create it
 */
export async function getUserOrganizations(userId: string) {
  let orgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      logo: organizations.logo,
      status: organizations.status,
      orgType: organizations.orgType,
      role: roles.slug,
      roleName: roles.name,
      eventScoped: roles.eventScoped,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
    .where(eq(organizationMembers.userId, userId));

  if (orgs.length === 0) {
    const ownedOrgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerId, userId));

    if (ownedOrgs.length > 0) {
      let ownerRole = await db.query.roles.findFirst({
        where: eq(roles.slug, "owner"),
      });

      if (!ownerRole) {
        const [created] = await db.insert(roles).values({
          name: "Owner",
          slug: "owner",
          description: "Full access to organization",
          isSystem: true,
        }).returning();
        ownerRole = created;
      }

      for (const org of ownedOrgs) {
        try {
          const existingMembership = await db
            .select({ id: organizationMembers.id })
            .from(organizationMembers)
            .where(
              and(
                eq(organizationMembers.organizationId, org.id),
                eq(organizationMembers.userId, userId)
              )
            )
            .limit(1);

          if (existingMembership.length === 0) {
            await db.insert(organizationMembers).values({
              organizationId: org.id,
              userId: userId,
              roleId: ownerRole.id,
              joinedAt: new Date(),
            });
          }
        } catch (err) {
          console.error(`Failed to repair membership for org ${org.id}:`, err);
        }
      }

      // Re-fetch organizations
      orgs = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          logo: organizations.logo,
          status: organizations.status,
          orgType: organizations.orgType,
          role: roles.slug,
          roleName: roles.name,
          eventScoped: roles.eventScoped,
        })
        .from(organizationMembers)
        .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
        .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
        .where(eq(organizationMembers.userId, userId));
      
    }
  }

  return orgs;
}

/**
 * Get permissions for a role
 */
export async function getRolePermissions(roleId: number): Promise<string[]> {
  const perms = await db
    .select({
      slug: permissions.slug,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));

  return perms.map((p) => p.slug);
}

/**
 * Check if user is a platform admin
 */
export async function getPlatformAdminLevel(userId: string) {
  const admin = await db
    .select({
      level: platformAdmins.level,
      permissions: platformAdmins.permissions,
    })
    .from(platformAdmins)
    .where(eq(platformAdmins.userId, userId))
    .limit(1);

  return admin[0] || null;
}

/**
 * Build complete user context with all organizations and permissions
 */
export async function buildUserContext(
  userId: string,
  email: string,
  name?: string,
  image?: string,
  currentOrgId?: number,
  isImpersonating?: boolean
): Promise<UserContext> {
  // Get platform admin status
  const platformAdmin = await getPlatformAdminLevel(userId);

  // Get all user organizations
  const userOrgs = await getUserOrganizations(userId);

  // Determine current organization - ALWAYS use first org if none specified
  let currentOrg = currentOrgId
    ? userOrgs.find((o) => o.id === currentOrgId)
    : userOrgs[0];

  let impersonating = false;

  // IMPERSONATION: If org not found in user's orgs and super_admin is impersonating
  if (!currentOrg && currentOrgId && isImpersonating && platformAdmin?.level === "super_admin") {
    const [impersonatedOrg] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        status: organizations.status,
        orgType: organizations.orgType,
      })
      .from(organizations)
      .where(eq(organizations.id, currentOrgId))
      .limit(1);

    if (impersonatedOrg) {
      currentOrg = {
        ...impersonatedOrg,
        role: "owner",
        roleName: "Owner (Impersonating)",
        eventScoped: false,
      };
      impersonating = true;
    }
  }

  // If specified org not found but user has orgs, use first one
  if (!currentOrg && userOrgs.length > 0) {
    currentOrg = userOrgs[0];
  }

  let currentOrgPermissions: string[] = [];

  if (currentOrg && !impersonating) {
    // Get membership to get roleId (skip for impersonation - admin has full access)
    const membership = await getUserMembership(userId, currentOrg.id);
    if (membership) {
      currentOrgPermissions = await getRolePermissions(membership.roleId);
    }
  }

  return {
    userId,
    email,
    name,
    image,
    platformLevel: platformAdmin?.level ?? undefined,
    isImpersonating: impersonating || undefined,
    currentOrganization: currentOrg
      ? {
          id: currentOrg.id,
          name: currentOrg.name,
          slug: currentOrg.slug,
          orgType: (currentOrg.orgType ?? "tenant") as OrgType,
          role: currentOrg.role as TenantRole,
          permissions: currentOrgPermissions,
          eventScoped: (currentOrg as Record<string, unknown>).eventScoped as boolean | undefined,
        }
      : undefined,
    organizations: userOrgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      role: o.role as TenantRole,
    })),
  };
}

/**
 * Create a tenant session from user context
 */
export async function createTenantSession(userContext: UserContext): Promise<TenantSession | null> {
  if (!userContext.currentOrganization) {
    return null;
  }

  const orgId = userContext.currentOrganization.id;
  const plan = await getOrgPlanInfo(orgId);

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, orgId),
    columns: { status: true },
  });

  return {
    user: userContext,
    organizationId: orgId,
    orgType: userContext.currentOrganization.orgType ?? "tenant",
    role: userContext.currentOrganization.role,
    permissions: userContext.currentOrganization.permissions,
    eventScoped: userContext.currentOrganization.eventScoped ?? false,
    plan,
    subscriptionStatus: sub?.status ?? null,
    isImpersonating: userContext.isImpersonating,
  };
}

/**
 * Get plan info with features for an organization
 */
export async function getOrgPlanInfo(orgId: number): Promise<PlanInfo | null> {
  // Get subscription → plan
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, orgId),
  });

  let planId = sub?.planId;

  // Fallback to org.planId if no subscription
  if (!planId) {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
      columns: { planId: true },
    });
    planId = org?.planId ?? undefined;
  }

  if (!planId) return null;

  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.id, planId),
  });

  if (!plan) return null;

  // Get features from featureFlags where planIds includes this plan
  const allFlags = await db
    .select({ key: featureFlags.key, planIds: featureFlags.planIds, enabled: featureFlags.enabled })
    .from(featureFlags)
    .where(eq(featureFlags.enabled, true));

  const features = allFlags
    .filter((f) => f.planIds && f.planIds.includes(planId!))
    .map((f) => f.key);

  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    features,
    limits: plan.limits ?? { maxUsers: 1, maxEvents: 1, maxStorage: 100 },
  };
}

// ============================================
// PERMISSION HELPERS
// ============================================

// Unified role hierarchy (higher index = more permissions).
// "client" is below "viewer" -- most restricted event-scoped role.
const ROLE_HIERARCHY: TenantRole[] = [
  "client",
  "viewer",
  "accountant",
  "staff",
  "manager",
  "admin",
  "owner",
];

/**
 * Check if a role has at least the required level
 */
export function hasRoleLevel(userRole: TenantRole, requiredRole: TenantRole): boolean {
  const userLevel = ROLE_HIERARCHY.indexOf(userRole);
  const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole);
  if (userLevel === -1 || requiredLevel === -1) return false;
  return userLevel >= requiredLevel;
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  session: TenantSession,
  permission: string
): PermissionCheck {
  // Platform admins have all permissions
  if (session.user.platformLevel === "super_admin") {
    return { allowed: true };
  }

  // Owner and admin have all permissions within their org
  if (session.role === "owner" || session.role === "admin") {
    return { allowed: true };
  }

  // Check specific permission
  if (session.permissions.includes(permission)) {
    return { allowed: true };
  }

  // Check wildcard permissions (e.g., "events:*" matches "events:read")
  const [resource] = permission.split(":");
  if (session.permissions.includes(`${resource}:*`)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Missing permission: ${permission}`,
  };
}

/**
 * Check if user can manage (invite/remove) other users
 */
export function canManageUsers(session: TenantSession): PermissionCheck {
  if (hasRoleLevel(session.role, "admin")) {
    return { allowed: true };
  }

  // Managers can invite team members
  if (session.role === "manager") {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "Only admins and managers can manage users",
  };
}

/**
 * Check if user can invite a specific role
 */
export function canInviteRole(
  session: TenantSession,
  targetRole: TenantRole
): PermissionCheck {
  // Can't invite roles higher than your own
  if (!hasRoleLevel(session.role, targetRole)) {
    return {
      allowed: false,
      reason: `Cannot invite users with role higher than yours`,
    };
  }

  // Only owner can invite other owners
  if (targetRole === "owner" && session.role !== "owner") {
    return {
      allowed: false,
      reason: "Only owners can invite other owners",
    };
  }

  return { allowed: true };
}

/**
 * Check if user can access a specific event
 * Non-eventScoped roles bypass this check (they see all events)
 * eventScoped roles must be in event_participants
 */
export async function canAccessEvent(
  session: TenantSession,
  eventId: number
): Promise<PermissionCheck> {
  // Non-scoped roles can access all events in their org
  if (!session.eventScoped) {
    return { allowed: true };
  }

  // Platform admins and impersonation bypass
  if (session.user.platformLevel === "super_admin" || session.isImpersonating) {
    return { allowed: true };
  }

  // For event-scoped roles, check event_participants
  const participant = await getEventParticipant(session.user.userId, eventId);
  if (participant) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "No tienes acceso a este evento",
  };
}

/**
 * Check if user can access a specific task
 * Non-eventScoped roles bypass this check
 * eventScoped roles:
 *   - tasks:edit on event → full access to all event tasks
 *   - tasks:view on event → only if user is task_participant, assignedTo, or createdBy
 */
export async function canAccessTask(
  session: TenantSession,
  taskId: number
): Promise<PermissionCheck> {
  // Non-scoped roles can access all tasks in their org
  if (!session.eventScoped) {
    return { allowed: true };
  }

  // Platform admins and impersonation bypass
  if (session.user.platformLevel === "super_admin" || session.isImpersonating) {
    return { allowed: true };
  }

  // Check if user is a direct participant of the task
  const taskAccess = await getTaskParticipantAccess(session.user.userId, taskId);
  if (taskAccess) {
    return { allowed: true };
  }

  // Get task details to check assignedTo, createdBy, and event permissions
  const task = await db.query.tasks.findFirst({
    where: (t, { eq }) => eq(t.id, taskId),
    columns: { eventId: true, assignedTo: true, createdBy: true },
  });

  if (!task) {
    return { allowed: false, reason: "Tarea no encontrada" };
  }

  // Direct assignment or creator
  if (task.assignedTo === session.user.userId || task.createdBy === session.user.userId) {
    return { allowed: true };
  }

  // Check event-level permission: only tasks:edit grants access to all event tasks
  if (task.eventId) {
    const eventAccess = await getEventParticipant(session.user.userId, task.eventId);
    if (eventAccess) {
      const perms = (eventAccess.permissions as Record<string, string>) || {};
      if (perms.tasks === "edit") {
        return { allowed: true };
      }
    }
  }

  return {
    allowed: false,
    reason: "No tienes acceso a esta tarea",
  };
}
