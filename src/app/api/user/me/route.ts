import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/**
 * GET /api/user/me
 * Returns current user's role and permissions for client-side RBAC
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: session.user.userId,
        role: session.role,
        permissions: session.permissions,
        organizationId: session.organizationId,
        isImpersonating: session.isImpersonating || false,
      },
    });
  } catch (error) {
    console.error("GET /api/user/me error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch session";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
