import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireLimit, requireActiveSubscription } from "@/lib/session";
import { getEvents, createEvent } from "@/lib/events";
import { notifyNewEvent } from "@/lib/push-notifications";

// GET /api/events - List events
export async function GET(request: NextRequest) {
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch events";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/events - Create event
export async function POST(request: NextRequest) {
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create event";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}
