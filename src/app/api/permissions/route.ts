import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { permissions } from "@/db/schema";

/**
 * GET /api/permissions
 * List all permissions grouped by resource
 */
export async function GET() {
  try {
    await requirePermission("team:read");

    const allPerms = await db
      .select()
      .from(permissions)
      .orderBy(permissions.resource, permissions.action);

    // Group by resource
    const grouped: Record<string, typeof allPerms> = {};
    for (const perm of allPerms) {
      if (!grouped[perm.resource]) {
        grouped[perm.resource] = [];
      }
      grouped[perm.resource].push(perm);
    }

    return NextResponse.json({
      success: true,
      data: {
        permissions: allPerms,
        grouped,
      },
    });
  } catch (error) {
    console.error("GET /api/permissions error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch permissions";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}
