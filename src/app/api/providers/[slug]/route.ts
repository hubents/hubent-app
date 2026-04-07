import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * GET /api/providers/[slug]
 * Public endpoint - returns verified org profile (providers + planners)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const org = await db.query.organizations.findFirst({
      where: and(
        eq(organizations.slug, slug),
        or(
          eq(organizations.orgType, "provider"),
          eq(organizations.orgType, "tenant")
        ),
        eq(organizations.verificationStatus, "verified")
      ),
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Profile not found" } },
        { status: 404 }
      );
    }

    const displayLogo = org.invoiceLogo || org.logo || null;

    return NextResponse.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    console.error("GET /api/providers/[slug] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch profile" } },
      { status: 500 }
    );
  }
}
