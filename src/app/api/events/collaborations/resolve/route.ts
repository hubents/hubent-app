import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { eventCollaborations, events, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Token is required" } },
        { status: 400 },
      );
    }

    const collab = await db.query.eventCollaborations.findFirst({
      where: eq(eventCollaborations.invitationToken, token),
    });

    if (!collab) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Invitación no encontrada o expirada" } },
        { status: 404 },
      );
    }

    const event = await db.query.events.findFirst({
      where: eq(events.id, collab.eventId),
      columns: { name: true, date: true, location: true },
    });

    const hostOrg = await db.query.organizations.findFirst({
      where: eq(organizations.id, collab.hostOrgId),
      columns: { name: true, logo: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: collab.id,
        eventName: event?.name || "Evento",
        eventDate: event?.date?.toISOString() ?? null,
        eventLocation: event?.location ?? null,
        hostOrgName: hostOrg?.name || "Organizador",
        hostOrgLogo: hostOrg?.logo ?? null,
        status: collab.status,
        permissions: collab.permissions,
        invitedAt: collab.invitedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error resolving invitation";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "RESOLVE_ERROR", message } },
      { status },
    );
  }
}
