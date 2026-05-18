import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { providerFavorites, organizations, vendors } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { z } from "zod";
import { apiHandler, ok, created, notFound, badRequest, conflict } from "@/lib/api-handler";
import { createContact } from "@/lib/contacts";

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

    // Also create a vendor contact if one doesn't already exist for this partner org
    const [existingVendor] = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(
        and(
          eq(vendors.organizationId, session.organizationId),
          eq(vendors.providerOrgId, parsed.data.providerOrgId)
        )
      )
      .limit(1);

    if (!existingVendor) {
      const partnerOrg = await db
        .select({
          name: organizations.name,
          providerCategory: organizations.providerCategory,
          publicEmail: organizations.publicEmail,
          phone: organizations.phone,
          website: organizations.website,
          city: organizations.city,
          country: organizations.country,
        })
        .from(organizations)
        .where(eq(organizations.id, parsed.data.providerOrgId))
        .limit(1)
        .then((r) => r[0]);

      if (partnerOrg) {
        try {
          const contact = await createContact(session, {
            type: "company",
            name: partnerOrg.name,
            email: partnerOrg.publicEmail ?? undefined,
            phone: partnerOrg.phone ?? undefined,
            website: partnerOrg.website ?? undefined,
            city: partnerOrg.city ?? undefined,
            country: partnerOrg.country ?? undefined,
            isVendor: true,
            vendorCategory: partnerOrg.providerCategory ?? "otro",
            source: "manual",
          });
          // Link the vendor record to the partner org so duplicates are detectable
          if (contact.vendorId) {
            await db
              .update(vendors)
              .set({ providerOrgId: parsed.data.providerOrgId })
              .where(eq(vendors.id, contact.vendorId));
          }
        } catch {
          // Non-blocking: if contact creation fails, the favorite is still saved
        }
      }
    }

    return created(favorite);
  }, "POST /api/providers/favorites");
}
