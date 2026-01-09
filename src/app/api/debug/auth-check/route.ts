import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { db } from "@/db";
import { organizationMembers, roles } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/debug/auth-check
 * Simple diagnostic to check what's happening with auth
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Check NextAuth session
    const session = await auth();
    
    // 2. Check headers
    const headersList = await headers();
    const xUserId = headersList.get("x-user-id");
    const xUserEmail = headersList.get("x-user-email");
    const xOrgId = headersList.get("x-organization-id");
    const cookieHeader = headersList.get("cookie");
    
    // 3. Check cookies directly
    const cookieStore = await cookies();
    const orgIdCookie = cookieStore.get("hubents-org-id");
    
    // 4. If we have a user, check their memberships
    let memberships: unknown[] = [];
    if (session?.user?.id) {
      memberships = await db
        .select({
          orgId: organizationMembers.organizationId,
          roleId: organizationMembers.roleId,
          roleName: roles.name,
          roleSlug: roles.slug,
        })
        .from(organizationMembers)
        .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
        .where(eq(organizationMembers.userId, session.user.id));
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      nextAuth: {
        hasSession: !!session,
        userId: session?.user?.id || null,
        email: session?.user?.email || null,
      },
      headers: {
        xUserId,
        xUserEmail,
        xOrgId,
        hasCookieHeader: !!cookieHeader,
        cookieHeaderLength: cookieHeader?.length || 0,
      },
      cookies: {
        orgIdCookie: orgIdCookie?.value || null,
      },
      database: {
        membershipCount: memberships.length,
        memberships,
      },
      diagnosis: getDiagnosis(session, xOrgId, orgIdCookie?.value, memberships),
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

function getDiagnosis(
  session: unknown,
  xOrgId: string | null,
  cookieOrgId: string | undefined,
  memberships: unknown[]
): { issues: string[]; fixes: string[] } {
  const issues: string[] = [];
  const fixes: string[] = [];

  if (!session) {
    issues.push("No NextAuth session - user not logged in");
    fixes.push("User needs to log in at /auth/login");
    return { issues, fixes };
  }

  if (memberships.length === 0) {
    issues.push("User has no organization memberships");
    fixes.push("Call POST /api/debug/session to auto-repair");
    return { issues, fixes };
  }

  if (!cookieOrgId) {
    issues.push("Cookie 'hubents-org-id' is not set");
    fixes.push("Need to set the organization cookie when user logs in or selects org");
  }

  if (!xOrgId) {
    issues.push("Header 'x-organization-id' is not being set by middleware");
    if (!cookieOrgId) {
      fixes.push("This is because the cookie is not set");
    } else {
      fixes.push("Middleware may not be running for API routes");
    }
  }

  if (issues.length === 0) {
    issues.push("Everything looks OK - auth should work");
  }

  return { issues, fixes };
}
