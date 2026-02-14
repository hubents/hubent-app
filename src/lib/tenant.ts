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
  console.log(`[getUserOrganizations] Looking up orgs for userId: ${userId}`);
  
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
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
    .where(eq(organizationMembers.userId, userId));

  console.log(`[getUserOrganizations] Found ${orgs.length} memberships`);

  // If no memberships found, check if user owns any organization
  if (orgs.length === 0) {
    console.log(`[getUserOrganizations] No memberships, checking owned orgs...`);
    
    const ownedOrgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerId, userId));

    console.log(`[getUserOrganizations] Found ${ownedOrgs.length} owned orgs`);

    if (ownedOrgs.length > 0) {
      // Find or create owner role
      let ownerRole = await db.query.roles.findFirst({
        where: eq(roles.slug, "owner"),
      });

      console.log(`[getUserOrganizations] Owner role exists: ${!!ownerRole}`);

      if (!ownerRole) {
        console.log(`[getUserOrganizations] Creating owner role...`);
        const [created] = await db.insert(roles).values({
          name: "Owner",
          slug: "owner",
          description: "Full access to organization",
          isSystem: true,
        }).returning();
        ownerRole = created;
        console.log(`[getUserOrganizations] Created owner role with ID: ${ownerRole.id}`);
      }

      // Create membership for each owned org (check if exists first)
      for (const org of ownedOrgs) {
        console.log(`[getUserOrganizations] Checking membership for org ${org.id} (${org.name})`);
        try {
          // Check if membership already exists
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
            console.log(`[getUserOrganizations] Creating membership for org ${org.id}`);
            await db.insert(organizationMembers).values({
              organizationId: org.id,
              userId: userId,
              roleId: ownerRole.id,
              joinedAt: new Date(),
            });
            console.log(`[getUserOrganizations] Membership created for org ${org.id}`);
          } else {
            console.log(`[getUserOrganizations] Membership already exists for org ${org.id}`);
          }
        } catch (err) {
          console.error(`[getUserOrganizations] Error creating membership:`, err);
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

  return {
    user: userContext,
    organizationId: orgId,
    orgType: userContext.currentOrganization.orgType ?? "tenant",
    role: userContext.currentOrganization.role,
    permissions: userContext.currentOrganization.permissions,
    plan,
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

// Role hierarchy (higher index = more permissions)
const ROLE_HIERARCHY: TenantRole[] = [
  "viewer",
  "accountant",
  "assistant",
  "planner",
  "admin",
  "owner",
];

// Provider role hierarchy (separate track)
const PROVIDER_ROLE_HIERARCHY: TenantRole[] = [
  "provider_tech",
  "provider_admin",
  "provider_owner",
];

/**
 * Check if a role has at least the required level
 */
export function hasRoleLevel(userRole: TenantRole, requiredRole: TenantRole): boolean {
  // Check if roles are in provider hierarchy
  const isProviderUser = PROVIDER_ROLE_HIERARCHY.includes(userRole);
  const isProviderRequired = PROVIDER_ROLE_HIERARCHY.includes(requiredRole);

  // Cross-hierarchy comparison: provider roles can't match tenant requirements and vice versa
  if (isProviderUser !== isProviderRequired) return false;

  const hierarchy = isProviderUser ? PROVIDER_ROLE_HIERARCHY : ROLE_HIERARCHY;
  const userLevel = hierarchy.indexOf(userRole);
  const requiredLevel = hierarchy.indexOf(requiredRole);
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
  if (session.role === "owner" || session.role === "admin" ||
      session.role === "provider_owner") {
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

  // Planners can invite vendors and clients
  if (session.role === "planner") {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "Only admins and planners can manage users",
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
 */
export async function canAccessEvent(
  session: TenantSession,
  eventId: number
): Promise<PermissionCheck> {
  // Planners and above can access all events in their org
  if (hasRoleLevel(session.role, "planner")) {
    return { allowed: true };
  }

  // For vendors and clients, check if they're participants
  // This will be implemented when we have event_participants table
  // For now, deny access
  return {
    allowed: false,
    reason: "You don't have access to this event",
  };
}

/**
 * Check if user can access a specific task
 */
export async function canAccessTask(
  session: TenantSession,
  taskId: number
): Promise<PermissionCheck> {
  // Planners and above can access all tasks in their org
  if (hasRoleLevel(session.role, "planner")) {
    return { allowed: true };
  }

  // For others, check if they're participants
  // This will be implemented when we have task_participants table
  return {
    allowed: false,
    reason: "You don't have access to this task",
  };
}
