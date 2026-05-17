import { NextRequest } from "next/server";
import { db } from "@/db";
import { organizations, orgPortfolio, orgReviews, partnerClaimTokens } from "@/db/schema";
import { eq, and, or, asc, desc, avg, count, ilike } from "drizzle-orm";
import { apiHandler, ok, notFound } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * GET /api/providers/[slug]
 * Public endpoint — returns org profile regardless of verification status.
 * Unverified profiles are shown with a limited view and a claim CTA.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { slug } = await params;

    const org = await db.query.organizations.findFirst({
      where: and(
        eq(organizations.slug, slug),
        or(
          eq(organizations.orgType, "provider"),
          eq(organizations.orgType, "tenant")
        )
      ),
    });

    if (!org) {
      return notFound("Profile not found");
    }

    const displayLogo = org.invoiceLogo || org.logo || null;

    // Portfolio: up to 12 items ordered by sortOrder
    const portfolio = await db
      .select()
      .from(orgPortfolio)
      .where(eq(orgPortfolio.organizationId, org.id))
      .orderBy(asc(orgPortfolio.sortOrder))
      .limit(12);

    // Reviews: reviewer org join alias
    const reviewerOrg = db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .as("reviewer_org");

    const recentReviews = await db
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
      .orderBy(desc(orgReviews.createdAt))
      .limit(5);

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

    // Pending claim token: if org has a public email and there's an unclaimed
    // token for it, surface the token so the page can show a "claim this profile" CTA.
    let pendingClaimToken: string | null = null;
    if (org.verificationStatus !== "verified" && org.publicEmail) {
      const pending = await db.query.partnerClaimTokens.findFirst({
        where: (c, { and, or, eq }) => and(
          ilike(partnerClaimTokens.email, org.publicEmail!),
          or(
            eq(partnerClaimTokens.status, "pending"),
            eq(partnerClaimTokens.status, "needs_manual_verification")
          )
        ),
      });
      pendingClaimToken = pending?.token ?? null;
    }

    // Claimed at: most recent claimed token for this org
    const claimedToken = await db.query.partnerClaimTokens.findFirst({
      where: (c, { eq }) => eq(partnerClaimTokens.claimedOrgId, org.id),
      orderBy: (c, { desc }) => [desc(c.claimedAt)],
    });

    return ok({
      name: org.name,
      slug: org.slug,
      // Same asset as fiscal "logo for documents" when logo column is empty (legacy)
      logo: displayLogo,
      orgType: org.orgType,
      phone: org.phone,
      website: org.website,
      address: org.address,
      instagramHandle: org.instagramHandle,
      providerCategory: org.providerCategory,
      serviceRadius: org.serviceRadius,
      serviceAreas: org.serviceAreas,
      description: org.description,
      tagline: org.tagline,
      coverImage: org.coverImage,
      city: org.city,
      region: org.region,
      country: org.country,
      publicEmail: org.publicEmail,
      priceRange: org.priceRange,
      instagramPosts: org.instagramPosts,
      brochureUrl: org.brochureUrl,
      verificationStatus: org.verificationStatus,
      claimedAt: claimedToken?.claimedAt ?? null,
      pendingClaimToken,
      portfolio,
      reviews: {
        items: recentReviews,
        averageRating: stats?.averageRating ? Number(stats.averageRating) : null,
        totalReviews: Number(stats?.totalReviews ?? 0),
      },
    });
  }, "GET /api/providers/[slug]");
}
