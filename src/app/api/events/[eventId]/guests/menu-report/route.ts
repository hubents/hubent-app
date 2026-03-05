import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { guests, rsvpResponses, guestCompanions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/guests/menu-report - Get menu report
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "guests", "view");

    const guestMenus = await db
      .select({
        menuPreference: guests.menuPreference,
        count: sql<number>`count(*)`,
      })
      .from(guests)
      .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
      .where(eq(guests.eventId, eventIdNum))
      .groupBy(guests.menuPreference);

    const companionMenus = await db
      .select({
        menuPreference: guestCompanions.menuPreference,
        count: sql<number>`count(*)`,
      })
      .from(guestCompanions)
      .innerJoin(guests, eq(guestCompanions.guestId, guests.id))
      .where(eq(guests.eventId, eventIdNum))
      .groupBy(guestCompanions.menuPreference);

    const menuSummary: Record<string, { guests: number; companions: number; total: number }> = {};

    for (const row of guestMenus) {
      const menu = row.menuPreference || "Sin especificar";
      if (!menuSummary[menu]) {
        menuSummary[menu] = { guests: 0, companions: 0, total: 0 };
      }
      menuSummary[menu].guests = Number(row.count);
      menuSummary[menu].total += Number(row.count);
    }

    for (const row of companionMenus) {
      const menu = row.menuPreference || "Sin especificar";
      if (!menuSummary[menu]) {
        menuSummary[menu] = { guests: 0, companions: 0, total: 0 };
      }
      menuSummary[menu].companions = Number(row.count);
      menuSummary[menu].total += Number(row.count);
    }

    const report = Object.entries(menuSummary).map(([menu, counts]) => ({
      menu,
      ...counts,
    }));

    const totals = report.reduce(
      (acc, row) => ({
        guests: acc.guests + row.guests,
        companions: acc.companions + row.companions,
        total: acc.total + row.total,
      }),
      { guests: 0, companions: 0, total: 0 }
    );

    return NextResponse.json({
      success: true,
      data: {
        report,
        totals,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate menu report";
    const status = message.includes("Forbidden") ? 403 : message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "REPORT_ERROR", message } },
      { status }
    );
  }
}
