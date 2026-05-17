import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { organizations, orgReviews, vendors, eventCollaborations, events } from "@/db/schema";
import { eq, and, desc, or, avg, count } from "drizzle-orm";
import { apiHandler, ok, created, badRequest, notFound, forbidden } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ slug: string }> };

async function resolveOrgBySlug(slug: string) {
  return db.query.organizations.findFirst({
    where: and(
      eq(organizations.slug, slug),
      or(
        eq(organizations.orgType, "provider"),
        eq(organizations.orgType, "tenant")
      )
    ),
    columns: { id: true },
  });
}

/**
 * GET /api/providers/[slug]/reviews
 * Public — returns public reviews with reviewer org name, averageRating, totalReviews.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { slug } = await params;

    const org = await resolveOrgBySlug(slug);
    if (!org) return notFound("Provider not found");

    // Alias for the reviewer org join
    const reviewerOrg = db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .as("reviewer_org");

    const reviews = await db
      .select({
        id: orgReviews.id,
        rating: orgReviews.rating,
        title: orgReviews.title,
        content: orgReviews.content,
        isVerified: orgReviews.isVerified,
        createdAt: orgReviews.createdAt,
        reviewerOrgName: reviewerOrg.name,
      })
      .from(orgReviews)
      .leftJoin(reviewerOrg, eq(orgReviews.reviewerOrgId, reviewerOrg.id))
      .where(
        and(
          eq(orgReviews.organizationId, org.id),
          eq(orgReviews.isPublic, true)
        )
      )
      .orderBy(desc(orgReviews.createdAt));

    // Aggregate stats
    const [stats] = await db
      .select({
        averageRating: avg(orgReviews.rating),
        totalReviews: count(orgReviews.id),
      })
      .from(orgReviews)
      .where(
        and(
          eq(orgReviews.organizationId, org.id),
          eq(orgReviews.isPublic, true)
        )
      );

    return ok({
      reviews,
      averageRating: stats?.averageRating ? Number(stats.averageRating) : null,
      totalReviews: Number(stats?.totalReviews ?? 0),
    });
  }, "GET /api/providers/[slug]/reviews");
}

/**
 * POST /api/providers/[slug]/reviews
 * Authenticated — leave a review for a provider.
 * Body: { rating: number (1-5), title?: string, content?: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { slug } = await params;

    const org = await resolveOrgBySlug(slug);
    if (!org) return notFound("Provider not found");

    // Cannot review your own org
    if (session.organizationId === org.id) {
      return badRequest("No puedes dejar una reseña de tu propia organización");
    }

    // Only orgs that have actually worked with this provider can review.
    // Two valid relationships:
    //   1. Reviewer has this provider as a vendor in any of their events.
    //   2. There is an eventCollaboration linking reviewer (host) ↔ provider (guest) or vice-versa.
    const [hasVendorRelation] = await db
      .select({ one: vendors.id })
      .from(vendors)
      .where(
        and(
          eq(vendors.organizationId, session.organizationId),
          eq(vendors.providerOrgId, org.id),
        ),
      )
      .limit(1);

    const [hasCollabRelation] = await db
      .select({ one: eventCollaborations.id })
      .from(eventCollaborations)
      .leftJoin(events, eq(events.id, eventCollaborations.eventId))
      .where(
        or(
          // Reviewer was host, provider was guest
          and(
            eq(events.organizationId, session.organizationId),
            eq(eventCollaborations.guestOrgId, org.id),
          ),
          // Provider was host, reviewer was guest
          and(
            eq(events.organizationId, org.id),
            eq(eventCollaborations.guestOrgId, session.organizationId),
          ),
        ),
      )
      .limit(1);

    if (!hasVendorRelation && !hasCollabRelation) {
      return forbidden("Solo puedes reseñar proveedores con los que hayas trabajado");
    }

    // One review per org per provider
    const existing = await db.query.orgReviews.findFirst({
      where: and(
        eq(orgReviews.organizationId, org.id),
        eq(orgReviews.reviewerOrgId, session.organizationId),
      ),
      columns: { id: true },
    });
    if (existing) {
      return badRequest("Ya has dejado una reseña para este proveedor");
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("Body inválido");

    const rating = typeof body.rating === "number" ? body.rating : parseInt(body.rating, 10);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return badRequest("El rating debe ser un número entre 1 y 5");
    }

    const [review] = await db
      .insert(orgReviews)
      .values({
        organizationId: org.id,
        reviewerOrgId: session.organizationId,
        reviewerUserId: session.user.userId,
        rating,
        title: body.title ? String(body.title).trim() : null,
        content: body.content ? String(body.content).trim() : null,
        isVerified: true,
      })
      .returning();

    return created(review);
  }, "POST /api/providers/[slug]/reviews");
}
