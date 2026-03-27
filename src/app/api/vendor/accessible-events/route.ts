import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { providerEventAccess, events, organizations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { isMarketplaceType } from "@/lib/tenant-type";

/**
 * GET /api/vendor/accessible-events
 * Returns events the provider has access to, formatted for DocumentDrawer's event selector.
 * Response: { success: true, data: [{ id: number, name: string, plannerOrgName: string, accessId: number }] }
 */
export async function GET() {
  try {
    const session = await requireAuth();

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
      columns: { orgType: true },
    });
    if (!org || !isMarketplaceType(org.orgType || "")) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Not a provider organization" } },
        { status: 403 }
      );
    }

    const accessList = await db
      .select({
        id: events.id,
        name: events.name,
        plannerOrgName: organizations.name,
        accessId: providerEventAccess.id,
      })
      .from(providerEventAccess)
      .innerJoin(events, eq(events.id, providerEventAccess.eventId))
      .innerJoin(organizations, eq(organizations.id, providerEventAccess.plannerOrgId))
      .where(eq(providerEventAccess.providerOrgId, session.organizationId))
      .orderBy(desc(events.date));

    return NextResponse.json({ success: true, data: accessList });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch accessible events";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
