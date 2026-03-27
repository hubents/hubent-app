import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { organizations, providerFavorites } from "@/db/schema";
import { eq, and, or, ilike, desc, sql, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";

/**
 * GET /api/providers
 * Marketplace HubEnts — search providers with visibility rules.
 *
 * Visibility:
 * - ownerId IS NOT NULL → registered provider, visible to all
 * - ownerId IS NULL AND createdByOrgId = myOrgId → unclaimed, visible only to creator
 *
 * Query params:
 *   ?search=text    — name, tagline, city, services
 *   ?category=X     — filter by providerCategory
 *   ?city=X         — filter by city
 *   ?priceRange=$   — filter by priceRange
 *   ?verified=true  — only verified
 *   ?favorites=true — only my favorites
 *   ?myProviders=true — only providers created by my org (includes unclaimed)
 *   ?page=1&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const city = searchParams.get("city") || "";
    const priceRange = searchParams.get("priceRange") || "";
    const verifiedOnly = searchParams.get("verified") === "true";
    const favoritesOnly = searchParams.get("favorites") === "true";
    const myProvidersOnly = searchParams.get("myProviders") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = (page - 1) * limit;

    // Base condition: must be provider org type
    const conditions = [eq(organizations.orgType, "provider")];

    // Visibility rule: registered OR created by my org
    conditions.push(
      or(
        isNotNull(organizations.ownerId),
        eq(organizations.createdByOrgId, session.organizationId)
      )!
    );

    // Filters
    if (search) {
      conditions.push(
        sql`(${ilike(organizations.name, `%${search}%`)} OR ${ilike(organizations.tagline, `%${search}%`)} OR ${ilike(organizations.city, `%${search}%`)} OR ${ilike(organizations.instagramHandle, `%${search}%`)})`
      );
    }

    if (category) {
      conditions.push(eq(organizations.providerCategory, category));
    }

    if (city) {
      conditions.push(ilike(organizations.city, `%${city}%`));
    }

    if (priceRange) {
      conditions.push(eq(organizations.priceRange, priceRange));
    }

    if (verifiedOnly) {
      conditions.push(eq(organizations.verificationStatus, "verified"));
    }

    if (myProvidersOnly) {
      conditions.push(eq(organizations.createdByOrgId, session.organizationId));
    }

    // Build query with optional favorites join
    const baseQuery = db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        tagline: organizations.tagline,
        description: organizations.description,
        providerCategory: organizations.providerCategory,
        city: organizations.city,
        region: organizations.region,
        country: organizations.country,
        priceRange: organizations.priceRange,
        averageRating: organizations.averageRating,
        totalReviews: organizations.totalReviews,
        verificationStatus: organizations.verificationStatus,
        isFeatured: organizations.isFeatured,
        coverImage: organizations.coverImage,
        instagramHandle: organizations.instagramHandle,
        services: organizations.services,
        categories: organizations.categories,
        profileCompleteness: organizations.profileCompleteness,
        ownerId: organizations.ownerId,
        createdByOrgId: organizations.createdByOrgId,
        phone: organizations.phone,
        website: organizations.website,
        // Favorite check via subquery
        isFavorite: sql<boolean>`EXISTS (
          SELECT 1 FROM provider_favorites pf
          WHERE pf.provider_org_id = ${organizations.id}
          AND pf.organization_id = ${session.organizationId}
          AND pf.user_id = ${session.user.userId}
        )`.as("is_favorite"),
      })
      .from(organizations)
      .where(and(...conditions))
      .orderBy(
        desc(organizations.isFeatured),
        desc(sql`CASE WHEN ${organizations.ownerId} IS NOT NULL THEN 1 ELSE 0 END`),
        desc(organizations.averageRating),
        desc(organizations.createdAt)
      )
      .limit(limit)
      .offset(offset);

    // If favorites-only, add HAVING/filter via subquery
    let providers;
    if (favoritesOnly) {
      const favIds = await db
        .select({ providerOrgId: providerFavorites.providerOrgId })
        .from(providerFavorites)
        .where(
          and(
            eq(providerFavorites.organizationId, session.organizationId),
            eq(providerFavorites.userId, session.user.userId)
          )
        );
      const favIdSet = favIds.map((f) => f.providerOrgId);
      if (favIdSet.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          meta: { page, limit, total: 0 },
        });
      }
      conditions.push(sql`${organizations.id} IN (${sql.join(favIdSet.map(id => sql`${id}`), sql`, `)})`);
      providers = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          logo: organizations.logo,
          tagline: organizations.tagline,
          description: organizations.description,
          providerCategory: organizations.providerCategory,
          city: organizations.city,
          region: organizations.region,
          country: organizations.country,
          priceRange: organizations.priceRange,
          averageRating: organizations.averageRating,
          totalReviews: organizations.totalReviews,
          verificationStatus: organizations.verificationStatus,
          isFeatured: organizations.isFeatured,
          coverImage: organizations.coverImage,
          instagramHandle: organizations.instagramHandle,
          services: organizations.services,
          categories: organizations.categories,
          profileCompleteness: organizations.profileCompleteness,
          ownerId: organizations.ownerId,
          createdByOrgId: organizations.createdByOrgId,
          phone: organizations.phone,
          website: organizations.website,
          isFavorite: sql<boolean>`true`.as("is_favorite"),
        })
        .from(organizations)
        .where(and(...conditions))
        .orderBy(desc(organizations.isFeatured), desc(organizations.averageRating))
        .limit(limit)
        .offset(offset);
    } else {
      providers = await baseQuery;
    }

    // Enrich response
    const enriched = providers.map((p) => ({
      ...p,
      isUnclaimed: p.ownerId === null,
      isMyProvider: p.createdByOrgId === session.organizationId,
      // Remove internal fields
      ownerId: undefined,
      createdByOrgId: undefined,
    }));

    // Count total
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizations)
      .where(and(...conditions));

    return NextResponse.json({
      success: true,
      data: enriched,
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

const createProviderSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  category: z.string().min(1),
  instagram: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

/**
 * POST /api/providers
 * Create an unclaimed provider (Google Business style).
 * Creates org with orgType="provider", ownerId=NULL, createdByOrgId=callerOrg.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const parsed = createProviderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Generate unique slug
    const baseSlug = data.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const slug = `${baseSlug}-${nanoid(6)}`;

    const [provider] = await db
      .insert(organizations)
      .values({
        name: data.name,
        slug,
        orgType: "provider",
        ownerId: null,
        createdByOrgId: session.organizationId,
        providerCategory: data.category,
        phone: data.phone || null,
        instagramHandle: data.instagram || null,
        city: data.city || null,
        description: data.notes || null,
        verificationStatus: "unverified",
        profileCompleteness: 0,
      })
      .returning({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        providerCategory: organizations.providerCategory,
      });

    // TODO: If email provided, create providerInvitations record and send email

    return NextResponse.json(
      {
        success: true,
        data: {
          ...provider,
          invitationSent: false,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/providers error:", error);
    const message = error instanceof Error ? error.message : "Failed to create provider";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status }
    );
  }
}
