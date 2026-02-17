import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { buildUserContext, createTenantSession } from "@/lib/tenant";
import { getUsage } from "@/lib/entitlements";
import type { TenantSession, UserContext } from "@/types";

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
  return await createTenantSession(userContext);
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
 * Require a specific role level
 */
export async function requireRole(
  minRole: "viewer" | "accountant" | "assistant" | "planner" | "admin" | "owner"
): Promise<TenantSession> {
  const session = await requireAuth();
  
  const roleHierarchy = ["viewer", "accountant", "assistant", "planner", "admin", "owner"];
  const providerBypass = ["provider_owner", "provider_admin", "provider_tech"];

  // Provider owner/admin bypass tenant role checks (they operate in their own hierarchy)
  if (providerBypass.includes(session.role)) {
    return session;
  }

  const userRoleIndex = roleHierarchy.indexOf(session.role);
  const requiredRoleIndex = roleHierarchy.indexOf(minRole);

  if (userRoleIndex < requiredRoleIndex) {
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
 * Require platform admin access
 */
export async function requirePlatformAdmin(): Promise<TenantSession> {
  const session = await requireAuth();
  
  if (!session.user.platformLevel) {
    throw new Error("Forbidden: Platform admin access required");
  }

  return session;
}
