import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { providerFavorites } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ providerOrgId: string }> };

/**
 * DELETE /api/providers/favorites/[providerOrgId]
 * Remove a provider from favorites
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { providerOrgId } = await params;
    const providerOrgIdNum = parseInt(providerOrgId, 10);

    if (isNaN(providerOrgIdNum)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid provider ID" } },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(providerFavorites)
      .where(
        and(
          eq(providerFavorites.organizationId, session.organizationId),
          eq(providerFavorites.userId, session.user.userId),
          eq(providerFavorites.providerOrgId, providerOrgIdNum)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Favorite not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/providers/favorites error:", error);
    const message = error instanceof Error ? error.message : "Failed to remove favorite";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status }
    );
  }
}
