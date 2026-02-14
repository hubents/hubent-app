import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getOrgEntitlements } from "@/lib/entitlements";

/**
 * GET /api/entitlements
 * Returns current org's plan, features, limits, and usage
 */
export async function GET() {
  try {
    const session = await requireAuth();
    const entitlements = await getOrgEntitlements(session.organizationId);

    return NextResponse.json({
      success: true,
      data: entitlements,
    });
  } catch (error) {
    console.error("GET /api/entitlements error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch entitlements";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}
