import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// GET /api/user/context - Get current user context including organization
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
        email: session.user.email,
        name: session.user.name,
        platformLevel: session.user.platformLevel,
        currentOrganization: session.user.currentOrganization,
        organizations: session.user.organizations,
      },
    });
  } catch (error) {
    console.error("Get user context error:", error);
    return NextResponse.json(
      { success: false, error: { code: "ERROR", message: "Failed to get user context" } },
      { status: 500 }
    );
  }
}
