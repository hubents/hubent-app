import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { buildUserContext, createTenantSession } from "@/lib/tenant";
import { getUsage } from "@/lib/entitlements";
import { checkEventSectionAccess } from "@/lib/event-permissions";
import type { TenantSession, TenantRole, UserContext, EventSectionPermissions } from "@/types";

/**
 * Get the current authenticated session with tenant context
 * Use this in Server Components and API Routes
 */
export async function getSession(): Promise<TenantSession | null> {
  const session = await auth();
  
  if (!session?.user?.id || !session?.user?.email) {
    return null;
  }

  // Get organization ID from headers (set by middleware) or cookies
  const headersList = await headers();
  const orgIdHeader = headersList.get("x-organization-id");
  let orgId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;

  // If no org ID from header, try to get from cookie header
  if (!orgId) {
    const cookieHeader = headersList.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(/hubents-org-id=(\d+)/);
      if (match) {
        orgId = parseInt(match[1], 10);
      }
    }
  }

  // Check if impersonating (header set by middleware from cookie)
  const isImpersonating = headersList.get("x-impersonating") === "true";

  // Build full user context
  const userContext = await buildUserContext(
    session.user.id,
    session.user.email,
    session.user.name ?? undefined,
    session.user.image ?? undefined,
    orgId,
    isImpersonating
  );

  // Create tenant session (async - fetches plan info)
  const tenantSession = await createTenantSession(userContext);
  return tenantSession;
}

/**
 * Get user context without requiring a specific organization
 * Useful for organization selection screens
 */
export async function getUserContext(): Promise<UserContext | null> {
  const session = await auth();
  
  if (!session?.user?.id || !session?.user?.email) {
    return null;
  }

  return buildUserContext(
    session.user.id,
    session.user.email,
    session.user.name ?? undefined,
    session.user.image ?? undefined
  );
}

/**
 * Require authentication - throws if not authenticated
 * Provides detailed error messages for debugging
 */
export async function requireAuth(): Promise<TenantSession> {
  // First check NextAuth session
  const authSession = await auth();
  
  if (!authSession?.user?.id || !authSession?.user?.email) {
    throw new Error("Unauthorized: Please log in");
  }

  // Then get full tenant session
  const session = await getSession();
  
  if (!session) {
    // User is authenticated but has no organization
    throw new Error("No organization found. Please complete your account setup at /api/debug/session (POST) to repair.");
  }

  return session;
}

/**
 * Require a specific role level.
 * 
 * DEPRECATED: Prefer requirePermission("resource:action") for all new code.
 * This function is kept for backward compatibility but now properly checks
 * both tenant and provider hierarchies instead of blindly bypassing.
 */
export async function requireRole(
  minRole: "client" | "viewer" | "accountant" | "assistant" | "planner" | "admin" | "owner"
): Promise<TenantSession> {
  const session = await requireAuth();
  
  const { hasRoleLevel } = await import("@/lib/tenant");

  // For provider roles, map the requested tenant minRole to an equivalent
  // provider hierarchy level. provider_owner = owner/admin, provider_admin = planner,
  // provider_tech = viewer/assistant.
  const PROVIDER_ROLE_MAP: Record<string, TenantRole> = {
    owner: "provider_owner",
    admin: "provider_owner",
    planner: "provider_admin",
    assistant: "provider_tech",
    accountant: "provider_admin",
    viewer: "provider_tech",
    client: "provider_tech",
  };

  const isProviderRole = ["provider_owner", "provider_admin", "provider_tech"].includes(session.role);
  
  if (isProviderRole) {
    const mappedRequired = PROVIDER_ROLE_MAP[minRole];
    if (mappedRequired && !hasRoleLevel(session.role, mappedRequired)) {
      throw new Error(`Forbidden: Requires ${minRole} role or higher`);
    }
    return session;
  }

  if (!hasRoleLevel(session.role, minRole as TenantRole)) {
    throw new Error(`Forbidden: Requires ${minRole} role or higher`);
  }

  return session;
}

/**
 * Require a specific permission (granular RBAC)
 */
export async function requirePermission(
  permission: string
): Promise<TenantSession> {
  const session = await requireAuth();

  // Platform admins bypass
  if (session.user.platformLevel === "super_admin") return session;

  // Impersonation has full access
  if (session.isImpersonating) return session;

  // Owner and admin have all permissions
  if (session.role === "owner" || session.role === "admin" || 
      session.role === "provider_owner") {
    return session;
  }

  // Check specific permission
  if (session.permissions.includes(permission)) return session;

  // Check wildcard (e.g., "events:*")
  const [resource] = permission.split(":");
  if (session.permissions.includes(`${resource}:*`)) return session;

  throw new Error(`Forbidden: Missing permission ${permission}`);
}

/**
 * Require a feature enabled in the org's plan
 */
export async function requireFeature(
  feature: string
): Promise<TenantSession> {
  const session = await requireAuth();

  // Platform admins bypass
  if (session.user.platformLevel === "super_admin") return session;
  if (session.isImpersonating) return session;

  if (!session.plan?.features.includes(feature)) {
    throw new Error(`UpgradeRequired: Feature '${feature}' not available in your plan`);
  }

  return session;
}

/**
 * Require an active (or trialing) subscription — blocks canceled/past_due orgs
 */
export async function requireActiveSubscription(): Promise<TenantSession> {
  const session = await requireAuth();

  // Platform admins and impersonation bypass
  if (session.user.platformLevel === "super_admin") return session;
  if (session.isImpersonating) return session;

  // No subscription record = legacy/trial user, allow (for now)
  if (!session.subscriptionStatus) return session;

  const blocked = ["canceled"];
  if (blocked.includes(session.subscriptionStatus)) {
    throw new Error("SubscriptionInactive: Your subscription is inactive. Please upgrade to continue.");
  }

  return session;
}

/**
 * Require that the org hasn't exceeded a plan limit
 */
export async function requireLimit(
  resource: "users" | "events" | "storage"
): Promise<TenantSession> {
  const session = await requireAuth();

  // Platform admins bypass
  if (session.user.platformLevel === "super_admin") return session;
  if (session.isImpersonating) return session;

  if (!session.plan) return session; // No plan = no limits enforced (trial/legacy)

  const limitKey = `max${resource.charAt(0).toUpperCase() + resource.slice(1)}` as keyof typeof session.plan.limits;
  const max = session.plan.limits[limitKey];

  if (max === -1) return session; // Unlimited

  const usage = await getUsage(session.organizationId);
  const current = usage[resource];

  if (current >= max) {
    throw new Error(`LimitReached: Maximum ${resource} (${max}) reached for your plan`);
  }

  return session;
}

/**
 * Require access to a specific event, optionally checking section-level permissions.
 * For non-eventScoped roles, this just validates org-level events:read.
 * For eventScoped roles, checks event_participants + section permissions.
 */
export async function requireEventAccess(
  eventId: number,
  section?: keyof EventSectionPermissions,
  level: "view" | "edit" = "view"
): Promise<TenantSession> {
  const session = await requirePermission("events:read");

  // If section check is needed and user is event-scoped
  if (section) {
    const access = await checkEventSectionAccess(session, eventId, section, level);
    if (!access.allowed) {
      throw new Error(`Forbidden: ${access.reason}`);
    }
  } else if (session.eventScoped) {
    // Just check basic event access for scoped roles
    const { canAccessEvent } = await import("@/lib/tenant");
    const access = await canAccessEvent(session, eventId);
    if (!access.allowed) {
      throw new Error(`Forbidden: ${access.reason}`);
    }
  }

  return session;
}

// Mapping from event section to org-level permission slugs (for non-eventScoped roles)
const SECTION_ORG_PERMISSION: Record<keyof EventSectionPermissions, { view: string; edit: string }> = {
  general:  { view: "events:read",  edit: "events:update" },
  tasks:    { view: "tasks:read",   edit: "tasks:update" },
  guests:   { view: "events:read",  edit: "events:update" },
  rsvp:     { view: "events:read",  edit: "events:update" },
  vendors:  { view: "vendors:read", edit: "vendors:read" },
  finances: { view: "finance:read", edit: "finance:read" },
  runsheet: { view: "events:read",  edit: "events:update" },
  calendar: { view: "events:read",  edit: "events:update" },
  settings: { view: "events:read",  edit: "events:update" },
};

/**
 * Require access to a specific event section at a given level.
 * Combines org-level RBAC (for non-eventScoped) with event_participants.permissions (for eventScoped).
 *
 * For non-eventScoped roles: maps section+level to an org permission and uses requirePermission.
 * For eventScoped roles: checks event_participants.permissions directly (bypasses org permission check).
 */
export async function requireEventSectionAccess(
  eventId: number,
  section: keyof EventSectionPermissions,
  level: "view" | "edit" = "view"
): Promise<TenantSession> {
  const session = await requireAuth();

  // Bypass: super_admin, impersonation, owner, admin
  if (session.user.platformLevel === "super_admin") return session;
  if (session.isImpersonating) return session;
  if (session.role === "owner" || session.role === "admin" || session.role === "provider_owner") {
    return session;
  }

  if (session.eventScoped) {
    // For eventScoped roles: check event_participants.permissions directly
    const access = await checkEventSectionAccess(session, eventId, section, level);
    if (!access.allowed) {
      throw new Error(`Forbidden: ${access.reason}`);
    }
    return session;
  }

  // For non-eventScoped roles: use standard org-level permission check
  const orgPerm = SECTION_ORG_PERMISSION[section]?.[level] || SECTION_ORG_PERMISSION[section]?.view;
  if (orgPerm) {
    if (!session.permissions.includes(orgPerm)) {
      const [resource] = orgPerm.split(":");
      if (!session.permissions.includes(`${resource}:*`)) {
        throw new Error(`Forbidden: Missing permission ${orgPerm}`);
      }
    }
  }

  return session;
}

/**
 * Require platform admin access
 */
export async function requirePlatformAdmin(): Promise<TenantSession> {
  const session = await requireAuth();
  
  if (!session.user.platformLevel) {
    throw new Error("Forbidden: Platform admin access required");
  }

  return session;
}
