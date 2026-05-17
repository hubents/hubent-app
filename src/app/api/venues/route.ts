import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { venues, venueSpaces, venueRates } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { apiHandler, ok, created, badRequest } from "@/lib/api-handler";

export async function GET(_req: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();

    const rows = await db
      .select()
      .from(venues)
      .where(and(eq(venues.organizationId, session.organizationId), eq(venues.isActive, true)))
      .orderBy(asc(venues.name));

    // Fetch spaces + rates for each venue
    const venueIds = rows.map((v) => v.id);
    const allSpaces = venueIds.length
      ? await db
          .select()
          .from(venueSpaces)
          .where(eq(venueSpaces.isActive, true))
          .orderBy(asc(venueSpaces.name))
      : [];
    const spaceIds = allSpaces.map((s) => s.id);
    const allRates = spaceIds.length
      ? await db.select().from(venueRates).orderBy(asc(venueRates.id))
      : [];

    const data = rows.map((v) => {
      const spaces = allSpaces
        .filter((s) => s.venueId === v.id)
        .map((s) => ({
          ...s,
          rates: allRates.filter((r) => r.spaceId === s.id),
        }));
      return { ...v, spaces };
    });

    return ok(data);
  }, "GET /api/venues");
}

export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const body = await req.json().catch(() => null);

    const name = String(body?.name || "").trim();
    if (!name) {
      return badRequest("Nombre es obligatorio");
    }

    const [venue] = await db
      .insert(venues)
      .values({
        organizationId: session.organizationId,
        name,
        city: body?.city || null,
        address: body?.address || null,
        contact: body?.contact || null,
        email: body?.email || null,
        phone: body?.phone || null,
        web: body?.web || null,
        color: body?.color || "#5B8FE8",
        initials: body?.initials || name.slice(0, 2).toUpperCase(),
        cover: body?.cover || null,
      })
      .returning();

    return created({ ...venue, spaces: [] });
  }, "POST /api/venues");
}
