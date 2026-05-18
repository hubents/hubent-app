import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { organizations, platformAdmins } from "@/db/schema";
import { isNull, and, isNotNull, eq } from "drizzle-orm";
import { geocodeCity } from "@/lib/geocode";

/**
 * POST /api/admin/geocode-orgs
 * Geocodifica todas las organizaciones que tienen ciudad/país pero no coordenadas.
 * Solo accesible por platform admins.
 */
export async function POST() {
  try {
    const session = await requireAuth();
    const isAdmin = await db.query.platformAdmins.findFirst({
      where: eq(platformAdmins.userId, session.user.userId),
      columns: { id: true },
    });
    if (!isAdmin && session.role !== "owner") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const orgs = await db
      .select({ id: organizations.id, city: organizations.city, country: organizations.country })
      .from(organizations)
      .where(
        and(
          isNull(organizations.lat),
          isNotNull(organizations.city)
        )
      );

    let updated = 0;
    let failed = 0;

    for (const org of orgs) {
      if (!org.city && !org.country) continue;
      // Respect Nominatim rate limit (1 req/s)
      await new Promise((r) => setTimeout(r, 1100));
      const coords = await geocodeCity(org.city ?? "", org.country ?? "");
      if (coords) {
        await db
          .update(organizations)
          .set({ lat: coords.lat, lon: coords.lon })
          .where(eq(organizations.id, org.id));
        updated++;
      } else {
        failed++;
      }
    }

    return NextResponse.json({ success: true, data: { total: orgs.length, updated, failed } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
