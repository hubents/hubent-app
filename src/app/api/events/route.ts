import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireLimit, requireActiveSubscription } from "@/lib/session";
import { getEvents, createEvent } from "@/lib/events";
import { notifyNewEvent } from "@/lib/push-notifications";
import { withMonitoring } from "@/lib/monitoring";

// GET /api/events - List events
export const GET = withMonitoring(async (request: NextRequest) => {
  const session = await requirePermission("events:read");
  const { searchParams } = new URL(request.url);
  
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
