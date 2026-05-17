import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { providerFavorites } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, ok, notFound, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ providerOrgId: string }> };

/**
 * DELETE /api/providers/favorites/[providerOrgId]
 * Remove a provider from favorites
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { providerOrgId } = await params;
    const providerOrgIdNum = parseInt(providerOrgId, 10);

    if (isNaN(providerOrgIdNum)) {
      return badRequest("Invalid provider ID");
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
      return notFound("Favorite not found");
    }

    return ok(null);
  }, "DELETE /api/providers/favorites");
}
