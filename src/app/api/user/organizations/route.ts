import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserOrganizations } from "@/lib/tenant";

/**
 * GET /api/user/organizations
 * Returns all organizations the current user belongs to
 */
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const organizations = await getUserOrganizations(session.user.id);

    return NextResponse.json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    console.error("Get user organizations error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}
