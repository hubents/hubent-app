import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/session";
import { cookies } from "next/headers";
import { apiHandler, ok, notFound, badRequest, forbidden } from "@/lib/api-handler";

// POST /api/admin/impersonate - Start impersonating a tenant
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePlatformAdmin();

    // Only super_admin can impersonate
    if (session.user.platformLevel !== "super_admin") {
      return forbidden("Only super admins can impersonate tenants");
    }

    const body = await request.json();
    const { slug, organizationId } = body;

    if (!slug && !organizationId) {
      return badRequest("slug or organizationId required");
    }

    // Find the organization
    let org;
    if (organizationId) {
      [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
    } else {
      [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, slug))
        .limit(1);
    }

    if (!org) {
      return notFound("Organization not found");
    }

    // Set impersonation cookies
    const cookieStore = await cookies();

    // Set the org ID cookie
    cookieStore.set("hubents-org-id", org.id.toString(), {
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: "lax",
    });

    // Set impersonation flag cookie (to show banner)
    cookieStore.set("hubents-impersonating", "true", {
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: "lax",
    });

    // Store original org ID if user has one
    const currentOrgId = cookieStore.get("hubents-original-org-id")?.value;
    if (!currentOrgId && session.organizationId) {
      cookieStore.set("hubents-original-org-id", session.organizationId.toString(), {
        path: "/",
        maxAge: 60 * 60 * 24,
        sameSite: "lax",
      });
    }

    return ok({
      organizationId: org.id,
      organizationName: org.name,
      organizationSlug: org.slug,
    });
  }, "POST /api/admin/impersonate");
}

// DELETE /api/admin/impersonate - Stop impersonating
export async function DELETE() {
  return apiHandler(async () => {
    const cookieStore = await cookies();

    // Get original org ID
    const originalOrgId = cookieStore.get("hubents-original-org-id")?.value;

    // Clear impersonation cookies
    cookieStore.delete("hubents-impersonating");

    // Restore original org or clear
    if (originalOrgId) {
      cookieStore.set("hubents-org-id", originalOrgId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
      });
      cookieStore.delete("hubents-original-org-id");
    } else {
      cookieStore.delete("hubents-org-id");
    }

    return NextResponse.json({
      success: true,
      message: "Impersonation ended",
    });
  }, "DELETE /api/admin/impersonate");
}
