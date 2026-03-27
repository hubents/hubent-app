import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { organizations, organizationPortfolio } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

/**
 * GET /api/vendor/portfolio
 * Returns portfolio items for the current provider org
 */
export async function GET() {
  try {
    const session = await requireAuth();

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
      columns: { orgType: true },
    });

    if (!org || org.orgType !== "provider") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Not a provider organization" } },
        { status: 403 }
      );
    }

    const items = await db
      .select()
      .from(organizationPortfolio)
      .where(eq(organizationPortfolio.organizationId, session.organizationId))
      .orderBy(asc(organizationPortfolio.sortOrder));

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error("GET /api/vendor/portfolio error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch portfolio";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}

const createSchema = z.object({
  url: z.string().url(),
  thumbnail: z.string().url().optional().or(z.literal("")),
  title: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  type: z.enum(["image", "video"]).optional(),
  eventType: z.string().optional().or(z.literal("")),
});

/**
 * POST /api/vendor/portfolio
 * Add a portfolio item
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
      columns: { orgType: true },
    });

    if (!org || org.orgType !== "provider") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Not a provider organization" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Get current max sortOrder
    const existing = await db
      .select({ sortOrder: organizationPortfolio.sortOrder })
      .from(organizationPortfolio)
      .where(eq(organizationPortfolio.organizationId, session.organizationId))
      .orderBy(asc(organizationPortfolio.sortOrder));

    const maxOrder = existing.length > 0 ? Math.max(...existing.map(e => e.sortOrder || 0)) : -1;

    const [item] = await db
      .insert(organizationPortfolio)
      .values({
        organizationId: session.organizationId,
        url: data.url,
        thumbnail: data.thumbnail || null,
        title: data.title || null,
        description: data.description || null,
        type: data.type || "image",
        eventType: data.eventType || null,
        sortOrder: maxOrder + 1,
      })
      .returning();

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error("POST /api/vendor/portfolio error:", error);
    const message = error instanceof Error ? error.message : "Failed to add portfolio item";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status }
    );
  }
}
