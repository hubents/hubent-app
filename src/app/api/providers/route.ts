import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { organizations, providerFavorites, vendors } from "@/db/schema";
import { eq, and, ilike, desc, sql, inArray, or } from "drizzle-orm";

/**
 * GET /api/providers
 * Search organizations for the marketplace (providers + planners).
 * Query params: ?search=X&category=Y&city=Z&verified=true&favorites=true&myProviders=true&type=provider|planner&page=1&limit=50
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const city = searchParams.get("city") || "";
    const verified = searchParams.get("verified") === "true";
    const favoritesOnly = searchParams.get("favorites") === "true";
    const myProvidersOnly = searchParams.get("myProviders") === "true";
    const typeFilter = searchParams.get("type") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];

    if (typeFilter === "provider") {
      conditions.push(eq(organizations.orgType, "provider"));
    } else if (typeFilter === "planner") {
      conditions.push(eq(organizations.orgType, "tenant"));
    } else {
      conditions.push(
        or(
          eq(organizations.orgType, "provider"),
          eq(organizations.orgType, "tenant")
        )!
      );
    }

    if (verified) {
      conditions.push(eq(organizations.verificationStatus, "verified"));
    }

    if (search) {
      conditions.push(
        sql`(${ilike(organizations.name, `%${search}%`)} OR ${ilike(organizations.instagramHandle, `%${search}%`)} OR ${ilike(organizations.description, `%${search}%`)})`
      );
    }

    if (category) {
      conditions.push(eq(organizations.providerCategory, category));
    }

    if (city) {
      conditions.push(ilike(organizations.city, `%${city}%`));
    }

    // Get user's favorites for isFavorite flag
    const userFavorites = await db
      .select({ providerOrgId: providerFavorites.providerOrgId })
      .from(providerFavorites)
      .where(
        and(
          eq(providerFavorites.organizationId, session.organizationId),
          eq(providerFavorites.userId, session.user.userId)
        )
      );
    const favoriteIds = new Set(userFavorites.map((f) => f.providerOrgId));

    // If favorites filter active, restrict to favorite IDs
    if (favoritesOnly && favoriteIds.size > 0) {
      conditions.push(inArray(organizations.id, [...favoriteIds]));
    } else if (favoritesOnly) {
      return NextResponse.json({ success: true, data: [], meta: { page, limit, total: 0 } });
    }

    // If myProviders filter, restrict to orgs linked via vendors table
    if (myProvidersOnly) {
      const linkedVendors = await db
        .select({ providerOrgId: vendors.providerOrgId })
        .from(vendors)
        .where(eq(vendors.organizationId, session.organizationId));
      const linkedIds = linkedVendors
        .map((v) => v.providerOrgId)
        .filter((id): id is number => id !== null);
      if (linkedIds.length > 0) {
        conditions.push(inArray(organizations.id, linkedIds));
      } else {
        return NextResponse.json({ success: true, data: [], meta: { page, limit, total: 0 } });
      }
    }

    const rows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        orgType: organizations.orgType,
        description: organizations.description,
        tagline: organizations.tagline,
        providerCategory: organizations.providerCategory,
        city: organizations.city,
        region: organizations.region,
        coverImage: organizations.coverImage,
        verificationStatus: organizations.verificationStatus,
        instagramHandle: organizations.instagramHandle,
        phone: organizations.phone,
        website: organizations.website,
        profileCompleteness: organizations.profileCompleteness,
        services: organizations.services,
        serviceRadius: organizations.serviceRadius,
        serviceAreas: organizations.serviceAreas,
        priceRange: organizations.priceRange,
        country: organizations.country,
      })
      .from(organizations)
      .where(and(...conditions))
      .orderBy(desc(organizations.verifiedAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizations)
      .where(and(...conditions));

    const data = rows.map((p) => ({
      ...p,
      isFavorite: favoriteIds.has(p.id),
      isMyProvider: false,
      isUnclaimed: false,
      isFeatured: false,
      averageRating: null,
      totalReviews: null,
      categories: null,
    }));

    return NextResponse.json({
      success: true,
      data,
      meta: {
        page,
        limit,
        total: Number(countResult?.count ?? 0),
      },
    });
  } catch (error) {
    console.error("GET /api/providers error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch providers";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}
