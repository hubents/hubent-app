import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { providerFavorites, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

/**
 * GET /api/providers/favorites
 * Returns favorite provider IDs for the current user in their org
 */
export async function GET() {
  try {
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

    return NextResponse.json({
      success: true,
      data: favorites.map((f) => f.providerOrgId),
    });
  } catch (error) {
    console.error("GET /api/providers/favorites error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch favorites";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}

const addFavoriteSchema = z.object({
  providerOrgId: z.number().int().positive(),
});

/**
 * POST /api/providers/favorites
 * Add a provider to favorites
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const parsed = addFavoriteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    // Verify the target is actually a provider org
    const providerOrg = await db.query.organizations.findFirst({
      where: and(
        eq(organizations.id, parsed.data.providerOrgId),
        eq(organizations.orgType, "provider")
      ),
      columns: { id: true },
    });

    if (!providerOrg) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Provider not found" } },
        { status: 404 }
      );
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
      return NextResponse.json(
        { success: false, error: { code: "CONFLICT", message: "Already in favorites" } },
        { status: 409 }
      );
    }

    const [favorite] = await db
      .insert(providerFavorites)
      .values({
        organizationId: session.organizationId,
        userId: session.user.userId,
        providerOrgId: parsed.data.providerOrgId,
      })
      .returning();

    return NextResponse.json({ success: true, data: favorite }, { status: 201 });
  } catch (error) {
    console.error("POST /api/providers/favorites error:", error);
    const message = error instanceof Error ? error.message : "Failed to add favorite";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status }
    );
  }
}
