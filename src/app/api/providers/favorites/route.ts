import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { providerFavorites, organizations } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { z } from "zod";
import { apiHandler, ok, created, notFound, badRequest, conflict } from "@/lib/api-handler";

/**
 * GET /api/providers/favorites
 * Returns favorite provider IDs for the current user in their org
 */
export async function GET() {
  return apiHandler(async () => {
    const session = await requireAuth();

    const favorites = await db
      .select({ providerOrgId: providerFavorites.providerOrgId })
      .from(providerFavorites)
      .where(
        and(
          eq(providerFavorites.organizationId, session.organizationId),
          eq(providerFavorites.userId, session.user.userId)
        )
      );

    return ok(favorites.map((f) => f.providerOrgId));
  }, "GET /api/providers/favorites");
}

const addFavoriteSchema = z.object({
  providerOrgId: z.number().int().positive(),
});

/**
 * POST /api/providers/favorites
 * Add a provider to favorites
 */
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();

    const body = await request.json();
    const parsed = addFavoriteSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    // Verify the target is a provider or planner (tenant) org
    const providerOrg = await db.query.organizations.findFirst({
      where: and(
        eq(organizations.id, parsed.data.providerOrgId),
        or(
          eq(organizations.orgType, "provider"),
          eq(organizations.orgType, "tenant")
        )
      ),
      columns: { id: true },
    });

    if (!providerOrg) {
      return notFound("Organization not found");
    }

    // Check if already favorited
    const [existing] = await db
      .select({ id: providerFavorites.id })
      .from(providerFavorites)
      .where(
        and(
          eq(providerFavorites.organizationId, session.organizationId),
          eq(providerFavorites.userId, session.user.userId),
          eq(providerFavorites.providerOrgId, parsed.data.providerOrgId)
        )
      )
      .limit(1);

    if (existing) {
      return conflict("Already in favorites", "CONFLICT");
    }

    const [favorite] = await db
      .insert(providerFavorites)
      .values({
        organizationId: session.organizationId,
        userId: session.user.userId,
        providerOrgId: parsed.data.providerOrgId,
      })
      .returning();

    return created(favorite);
  }, "POST /api/providers/favorites");
}
