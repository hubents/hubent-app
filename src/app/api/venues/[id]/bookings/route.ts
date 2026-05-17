import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { venues, venueBookings, venueRates } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { apiHandler, ok, created, badRequest, notFound } from "@/lib/api-handler";

type Params = { params: Promise<{ id: string }> };

async function verifyVenueAccess(venueId: number, organizationId: number) {
  return db.query.venues.findFirst({
    where: and(eq(venues.id, venueId), eq(venues.organizationId, organizationId)),
    columns: { id: true },
  });
}

export async function GET(req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { id } = await params;
    const venueId = parseInt(id);
    if (isNaN(venueId)) return badRequest("ID inválido", "INVALID_ID");

    const venue = await verifyVenueAccess(venueId, session.organizationId);
    if (!venue) return notFound("Finca no encontrada");

    const bookings = await db
      .select()
      .from(venueBookings)
      .where(eq(venueBookings.venueId, venueId))
      .orderBy(asc(venueBookings.date));

    return ok(bookings);
  }, "GET /api/venues/[id]/bookings");
}

export async function POST(req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { id } = await params;
    const venueId = parseInt(id);
    if (isNaN(venueId)) return badRequest("ID inválido", "INVALID_ID");

    const venue = await verifyVenueAccess(venueId, session.organizationId);
    if (!venue) return notFound("Finca no encontrada");

    const body = await req.json().catch(() => null);
    const date = String(body?.date || "").trim();
    if (!date) return badRequest("date es obligatoria");

    // Fetch rate label/price from DB if rateId provided
    let rateLabel = body?.rateLabel || null;
    let price = body?.price || null;
    if (body?.rateId && !rateLabel) {
      const rate = await db.query.venueRates.findFirst({ where: eq(venueRates.id, Number(body.rateId)) });
      if (rate) { rateLabel = rate.label; price = rate.price; }
    }

    const [booking] = await db
      .insert(venueBookings)
      .values({
        venueId,
        spaceId: body?.spaceId ? Number(body.spaceId) : null,
        date,
        eventName: body?.eventName || null,
        eventId: body?.eventId ? Number(body.eventId) : null,
        status: body?.status || "opcion",
        rateId: body?.rateId ? Number(body.rateId) : null,
        rateLabel,
        price: price ? String(price) : null,
        notes: body?.notes || null,
      })
      .returning();

    return created(booking);
  }, "POST /api/venues/[id]/bookings");
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { id } = await params;
    const venueId = parseInt(id);
    if (isNaN(venueId)) return badRequest("ID inválido", "INVALID_ID");

    const venue = await verifyVenueAccess(venueId, session.organizationId);
    if (!venue) return notFound("Finca no encontrada");

    const body = await req.json().catch(() => null);
    const bookingId = Number(body?.id);
    if (!bookingId) return badRequest("id es obligatorio");

    const updateData: Partial<{ status: "libre" | "confirmado" | "opcion" | "bloqueado"; updatedAt: Date }> = { updatedAt: new Date() };
    if (body?.status) updateData.status = body.status;

    const [updated] = await db
      .update(venueBookings)
      .set(updateData)
      .where(and(eq(venueBookings.id, bookingId), eq(venueBookings.venueId, venueId)))
      .returning();

    if (!updated) return notFound("Reserva no encontrada");

    return ok(updated);
  }, "PATCH /api/venues/[id]/bookings");
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { id } = await params;
    const venueId = parseInt(id);
    if (isNaN(venueId)) return badRequest("ID inválido", "INVALID_ID");

    const venue = await verifyVenueAccess(venueId, session.organizationId);
    if (!venue) return notFound("Finca no encontrada");

    const { searchParams } = req.nextUrl;
    const bookingId = parseInt(searchParams.get("bookingId") || "");
    if (isNaN(bookingId)) return badRequest("bookingId es obligatorio");

    await db
      .delete(venueBookings)
      .where(and(eq(venueBookings.id, bookingId), eq(venueBookings.venueId, venueId)));

    return ok(null);
  }, "DELETE /api/venues/[id]/bookings");
}
