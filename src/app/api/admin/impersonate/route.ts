import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/session";
import { cookies } from "next/headers";

// POST /api/admin/impersonate - Start impersonating a tenant
export async function POST(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    
    // Only super_admin can impersonate
    if (session.user.platformLevel !== "super_admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only super admins can impersonate tenants" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { slug, organizationId } = body;

    if (!slug && !organizationId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "slug or organizationId required" } },
        { status: 400 }
      );
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
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Organization not found" } },
        { status: 404 }
      );
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

    return NextResponse.json({
      success: true,
      data: {
        organizationId: org.id,
        organizationName: org.name,
        organizationSlug: org.slug,
      },
    });
  } catch (error) {
    console.error("Impersonate error:", error);
    const message = error instanceof Error ? error.message : "Failed to impersonate";
    return NextResponse.json(
      { success: false, error: { code: "IMPERSONATE_ERROR", message } },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/impersonate - Stop impersonating
export async function DELETE() {
  try {
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
  } catch (error) {
    console.error("End impersonate error:", error);
    return NextResponse.json(
      { success: false, error: { code: "ERROR", message: "Failed to end impersonation" } },
      { status: 500 }
    );
  }
}
