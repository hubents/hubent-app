import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { buildUserContext, createTenantSession } from "@/lib/tenant";
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

  // Get organization ID from headers (set by middleware) or default to first org
  const headersList = await headers();
  const orgIdHeader = headersList.get("x-organization-id");
  const orgId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;

  // Build full user context
  const userContext = await buildUserContext(
    session.user.id,
    session.user.email,
    session.user.name ?? undefined,
    session.user.image ?? undefined,
    orgId
  );

  // Create tenant session
  return createTenantSession(userContext);
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
 */
export async function requireAuth(): Promise<TenantSession> {
  const session = await getSession();
  
  if (!session) {
    throw new Error("Unauthorized: Please log in");
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
  const userRoleIndex = roleHierarchy.indexOf(session.role);
  const requiredRoleIndex = roleHierarchy.indexOf(minRole);

  if (userRoleIndex < requiredRoleIndex) {
    throw new Error(`Forbidden: Requires ${minRole} role or higher`);
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
