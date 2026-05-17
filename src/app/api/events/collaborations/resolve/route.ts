import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { eventCollaborations, events, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiHandler, ok, badRequest, notFound } from "@/lib/api-handler";

export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return badRequest("Token is required");
    }

    const collab = await db.query.eventCollaborations.findFirst({
      where: eq(eventCollaborations.invitationToken, token),
    });

    if (!collab) {
      return notFound("Invitación no encontrada o expirada");
    }

    const event = await db.query.events.findFirst({
      where: eq(events.id, collab.eventId),
      columns: { name: true, date: true, location: true },
    });

    const hostOrg = await db.query.organizations.findFirst({
      where: eq(organizations.id, collab.hostOrgId),
      columns: { name: true, logo: true },
    });

    return ok({
      id: collab.id,
      eventName: event?.name || "Evento",
      eventDate: event?.date?.toISOString() ?? null,
      eventLocation: event?.location ?? null,
      hostOrgName: hostOrg?.name || "Organizador",
      hostOrgLogo: hostOrg?.logo ?? null,
      status: collab.status,
      permissions: collab.permissions,
      invitedAt: collab.invitedAt?.toISOString() ?? null,
    });
  }, "GET /api/events/collaborations/resolve");
}
