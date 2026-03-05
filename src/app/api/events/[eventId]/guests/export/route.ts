import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { guests, rsvpResponses, guestGroups, guestCompanions, rsvpTransportBookings, rsvpTransportOptions } from "@/db/schema";
import { eq } from "drizzle-orm";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/guests/export - Export guests to CSV
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "guests", "view");

    // Get all guests with their data
    const guestList = await db
      .select({
        id: guests.id,
        firstName: guests.firstName,
        lastName: guests.lastName,
        email: guests.email,
        phone: guests.phone,
        dietaryRestrictions: guests.dietaryRestrictions,
        notes: guests.notes,
        rsvpStatus: rsvpResponses.status,
        rsvpMessage: rsvpResponses.message,
        respondedAt: rsvpResponses.respondedAt,
        groupName: guestGroups.name,
      })
      .from(guests)
      .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
      .leftJoin(guestGroups, eq(guests.groupId, guestGroups.id))
      .where(eq(guests.eventId, eventIdNum))
      .orderBy(guests.lastName, guests.firstName);

    // Get companions for each guest
    const guestsWithDetails = await Promise.all(
      guestList.map(async (guest) => {
        const companions = await db
          .select({
            fullName: guestCompanions.fullName,
            menuPreference: guestCompanions.menuPreference,
            dietaryRestrictions: guestCompanions.dietaryRestrictions,
          })
          .from(guestCompanions)
          .where(eq(guestCompanions.guestId, guest.id));

        const transport = await db
          .select({
            name: rsvpTransportOptions.name,
            seats: rsvpTransportBookings.seats,
          })
          .from(rsvpTransportBookings)
          .leftJoin(rsvpTransportOptions, eq(rsvpTransportBookings.transportOptionId, rsvpTransportOptions.id))
          .where(eq(rsvpTransportBookings.guestId, guest.id))
          .limit(1);

        return {
          ...guest,
          companions: companions.map(c => c.fullName).join("; "),
          companionCount: companions.length,
          transport: transport[0]?.name || "",
          transportSeats: transport[0]?.seats || 0,
        };
      })
    );

    // Build CSV
    const headers = [
      "Nombre",
      "Apellido", 
      "Email",
      "Teléfono",
      "Estado RSVP",
      "Grupo",
      "Restricciones Alimentarias",
      "Acompañantes",
      "Cant. Acompañantes",
      "Transporte",
      "Asientos Transporte",
      "Mensaje",
      "Fecha Respuesta",
      "Notas",
    ];

    const statusLabels: Record<string, string> = {
      confirmed: "Confirmado",
      declined: "Rechazado",
      pending: "Pendiente",
    };

    const rows = guestsWithDetails.map(guest => [
      guest.firstName,
      guest.lastName || "",
      guest.email || "",
      guest.phone || "",
      statusLabels[guest.rsvpStatus || "pending"] || "Pendiente",
      guest.groupName || "",
      guest.dietaryRestrictions || "",
      guest.companions,
      guest.companionCount.toString(),
      guest.transport,
      guest.transportSeats.toString(),
      guest.rsvpMessage || "",
      guest.respondedAt ? new Date(guest.respondedAt).toLocaleDateString("es-ES") : "",
      guest.notes || "",
    ]);

    // Escape CSV values
    const escapeCSV = (value: string) => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map(row => row.map(escapeCSV).join(",")),
    ].join("\n");

    // Add BOM for Excel UTF-8 compatibility
    const bom = "\uFEFF";
    const csvWithBom = bom + csvContent;

    return new NextResponse(csvWithBom, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="invitados-evento-${eventIdNum}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export guests";
    const status = message.includes("Forbidden") ? 403 : message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
