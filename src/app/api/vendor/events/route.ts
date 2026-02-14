import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { providerEventAccess, events, organizations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/vendor/events
 * List events where the current provider org has access
 */
export async function GET() {
  try {
    const session = await requireAuth();

    // Verify caller is a provider org
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

    const accessList = await db
      .select({
        accessId: providerEventAccess.id,
        status: providerEventAccess.status,
        invitedAt: providerEventAccess.invitedAt,
        acceptedAt: providerEventAccess.acceptedAt,
        eventId: events.id,
        eventName: events.name,
        eventDate: events.date,
        eventEndDate: events.endDate,
        eventStatus: events.status,
        eventLocation: events.location,
        plannerOrgName: organizations.name,
        plannerOrgLogo: organizations.logo,
      })
      .from(providerEventAccess)
      .innerJoin(events, eq(events.id, providerEventAccess.eventId))
      .innerJoin(organizations, eq(organizations.id, providerEventAccess.plannerOrgId))
      .where(eq(providerEventAccess.providerOrgId, session.organizationId))
      .orderBy(desc(events.date));

    return NextResponse.json({ success: true, data: accessList });
  } catch (error) {
    console.error("GET /api/vendor/events error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch events";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}
