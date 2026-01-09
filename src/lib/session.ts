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
 * Provides detailed error messages for debugging
 */
export async function requireAuth(): Promise<TenantSession> {
  // First check NextAuth session
  const authSession = await auth();
  
  if (!authSession?.user?.id || !authSession?.user?.email) {
    console.error("[requireAuth] No NextAuth session found");
    throw new Error("Unauthorized: Please log in");
  }

  // Then get full tenant session
  const session = await getSession();
  
  if (!session) {
    // User is authenticated but has no organization - try to get user context for more info
    const userContext = await buildUserContext(
      authSession.user.id,
      authSession.user.email,
      authSession.user.name ?? undefined,
      authSession.user.image ?? undefined
    );
    
    console.error("[requireAuth] No tenant session. User context:", {
      userId: userContext.userId,
      email: userContext.email,
      organizationsCount: userContext.organizations.length,
      currentOrganization: userContext.currentOrganization,
      organizations: userContext.organizations,
    });
    
    throw new Error(`No organization found. User has ${userContext.organizations.length} organizations. Please visit /api/debug/session (POST) to repair.`);
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
