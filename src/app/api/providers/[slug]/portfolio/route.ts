import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, organizationPortfolio } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * GET /api/providers/[slug]/portfolio
 * Public endpoint - returns portfolio items for a provider
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const provider = await db.query.organizations.findFirst({
      where: and(
        eq(organizations.slug, slug),
        eq(organizations.orgType, "provider")
      ),
      columns: { id: true },
    });

    if (!provider) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Provider not found" } },
        { status: 404 }
      );
    }

    const items = await db
      .select({
        id: organizationPortfolio.id,
        url: organizationPortfolio.url,
        thumbnail: organizationPortfolio.thumbnail,
        title: organizationPortfolio.title,
        description: organizationPortfolio.description,
        type: organizationPortfolio.type,
        eventType: organizationPortfolio.eventType,
      })
      .from(organizationPortfolio)
      .where(eq(organizationPortfolio.organizationId, provider.id))
      .orderBy(asc(organizationPortfolio.sortOrder));

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error("GET /api/providers/[slug]/portfolio error:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to fetch portfolio" } },
      { status: 500 }
    );
  }
}
