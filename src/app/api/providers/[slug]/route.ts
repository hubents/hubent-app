import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * GET /api/providers/[slug]
 * Public endpoint - returns provider public profile
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const provider = await db.query.organizations.findFirst({
      where: and(
        eq(organizations.slug, slug),
        eq(organizations.orgType, "provider"),
        eq(organizations.verificationStatus, "verified")
      ),
    });

    if (!provider) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Provider not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        name: provider.name,
        slug: provider.slug,
        logo: provider.logo,
        phone: provider.phone,
        website: provider.website,
        address: provider.address,
        instagramHandle: provider.instagramHandle,
        providerCategory: provider.providerCategory,
        serviceRadius: provider.serviceRadius,
        serviceAreas: provider.serviceAreas,
      },
    });
  } catch (error) {
    console.error("GET /api/providers/[slug] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch provider" } },
      { status: 500 }
    );
  }
}
