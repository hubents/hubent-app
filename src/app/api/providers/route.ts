import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq, and, ilike, desc, sql } from "drizzle-orm";

/**
 * GET /api/providers
 * Search verified provider organizations (for planners)
 * Query params: ?search=X&category=Y&page=1&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission("vendors:read");

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = (page - 1) * limit;

    const conditions = [
      eq(organizations.orgType, "provider"),
      eq(organizations.verificationStatus, "verified"),
    ];

    if (search) {
      conditions.push(
        sql`(${ilike(organizations.name, `%${search}%`)} OR ${ilike(organizations.instagramHandle, `%${search}%`)})`
      );
    }

    if (category) {
      conditions.push(eq(organizations.providerCategory, category));
    }

    const providers = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        instagramHandle: organizations.instagramHandle,
        providerCategory: organizations.providerCategory,
        serviceRadius: organizations.serviceRadius,
        serviceAreas: organizations.serviceAreas,
        phone: organizations.phone,
        website: organizations.website,
      })
      .from(organizations)
      .where(and(...conditions))
      .orderBy(desc(organizations.verifiedAt))
      .limit(limit)
      .offset(offset);

    // Count total
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizations)
      .where(and(...conditions));

    return NextResponse.json({
      success: true,
      data: providers,
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
