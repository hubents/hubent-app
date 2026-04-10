import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireAuth, requireLimit, requireActiveSubscription } from "@/lib/session";
import { getEvents, createEvent } from "@/lib/events";
import { notifyNewEvent } from "@/lib/push-notifications";
import { withMonitoring } from "@/lib/monitoring";
import { db } from "@/db";
import { eventCollaborations, events, organizations, tasks, taskParticipants, vendors } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// GET /api/events - List events
// Supports ?scope=collaborated (events invited via event_collaborations)
// and ?scope=accessible (both owned + collaborated, for document drawers)
export const GET = withMonitoring(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");

  if (scope === "collaborated") {
    const session = await requireAuth();
    return getCollaboratedEvents(session);
  }

  if (scope === "accessible") {
    const session = await requireAuth();
    return getAccessibleEvents(session);
  }

  const session = await requirePermission("events:read");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const status = searchParams.get("status") || undefined;
  const type = searchParams.get("type") || undefined;

  const result = await getEvents(session, { page, limit, status, type });

  return NextResponse.json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
}, { name: "GET /api/events" });

async function getCollaboratedEvents(session: { organizationId: number }) {
  // Use event_collaborations (new bilateral table)
  const collabList = await db
    .select({
      accessId: eventCollaborations.id,
      status: eventCollaborations.status,
      permissions: eventCollaborations.permissions,
      invitedAt: eventCollaborations.invitedAt,
      acceptedAt: eventCollaborations.acceptedAt,
      eventId: events.id,
      eventName: events.name,
      eventType: events.type,
      eventDate: events.date,
      eventEndDate: events.endDate,
      eventStatus: events.status,
      eventLocation: events.location,
      eventGuestCount: events.guestCount,
      hostOrgName: organizations.name,
      hostOrgLogo: organizations.logo,
      taskCount: sql<number>`COALESCE((
        SELECT COUNT(*) FROM ${tasks}
        WHERE ${tasks.eventId} = ${events.id}
          AND (${tasks.organizationId} = ${session.organizationId}
               OR ${tasks.id} IN (
                 SELECT ${taskParticipants.taskId} FROM ${taskParticipants}
                 WHERE ${taskParticipants.collaboratorOrgId} = ${session.organizationId}
               ))
      ), 0)`.as("task_count"),
      pendingTaskCount: sql<number>`COALESCE((
        SELECT COUNT(*) FROM ${tasks}
        WHERE ${tasks.eventId} = ${events.id}
          AND ${tasks.status} NOT IN ('completed', 'cancelled')
          AND (${tasks.organizationId} = ${session.organizationId}
               OR ${tasks.id} IN (
                 SELECT ${taskParticipants.taskId} FROM ${taskParticipants}
                 WHERE ${taskParticipants.collaboratorOrgId} = ${session.organizationId}
               ))
      ), 0)`.as("pending_task_count"),
    })
    .from(eventCollaborations)
    .innerJoin(events, eq(events.id, eventCollaborations.eventId))
    .innerJoin(organizations, eq(organizations.id, eventCollaborations.hostOrgId))
    .where(eq(eventCollaborations.guestOrgId, session.organizationId))
    .orderBy(desc(events.date));

  return NextResponse.json({ success: true, data: collabList });
}

async function getAccessibleEvents(session: { organizationId: number }) {
  // Owned events
  const ownedEvents = await db
    .select({ id: events.id, name: events.name })
    .from(events)
    .where(eq(events.organizationId, session.organizationId))
    .orderBy(desc(events.date));

  // Collaborated events via event_collaborations (new table)
  const collaboratedEvents = await db
    .select({
      id: events.id,
      name: events.name,
      hostOrgName: organizations.name,
      accessId: eventCollaborations.id,
    })
    .from(eventCollaborations)
    .innerJoin(events, eq(events.id, eventCollaborations.eventId))
    .innerJoin(organizations, eq(organizations.id, eventCollaborations.hostOrgId))
    .where(
      and(
        eq(eventCollaborations.guestOrgId, session.organizationId),
        eq(eventCollaborations.status, "active"),
      ),
    )
    .orderBy(desc(events.date));

  return NextResponse.json({
    success: true,
    data: [
      ...ownedEvents.map(e => ({ ...e, type: "owned" as const })),
      ...collaboratedEvents.map(e => ({ ...e, type: "collaborated" as const })),
    ],
  });
}

// POST /api/events - Create event
export const POST = withMonitoring(async (request: NextRequest) => {
  const session = await requirePermission("events:create");
  await requireActiveSubscription();
  await requireLimit("events");
  const body = await request.json();

  const { name } = body;

  if (!name) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Name is required" } },
      { status: 400 }
    );
  }

  const event = await createEvent(session, {
    name,
    type: body.type,
    date: body.date ? new Date(body.date) : undefined,
    endDate: body.endDate ? new Date(body.endDate) : undefined,
    location: body.location,
    guestCount: body.guestCount,
    budget: body.budget,
    description: body.description,
    clientId: body.clientId,
    templateId: body.templateId,
  });

  // Send push notification for new event
  if (event.date) {
    notifyNewEvent(
      session.organizationId.toString(),
      event.id,
      event.name,
      new Date(event.date),
      session.user.userId
    ).catch(err => console.error("Push notification failed:", err));
  }

  return NextResponse.json({
    success: true,
    data: event,
  });
}, { name: "POST /api/events" });
