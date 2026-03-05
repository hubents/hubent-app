import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { events, eventVendors, vendors } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/vendors - List vendors for an event
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(eventIdNum, "vendors", "view");

    // Verify event belongs to organization
    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.id, eventIdNum),
          eq(events.organizationId, session.organizationId)
        )
      );

    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Event not found" } },
        { status: 404 }
      );
    }

    const eventVendorsList = await db
      .select({
        id: eventVendors.id,
        eventId: eventVendors.eventId,
        vendorId: eventVendors.vendorId,
        service: eventVendors.service,
        cost: eventVendors.cost,
        status: eventVendors.status,
        notes: eventVendors.notes,
        createdAt: eventVendors.createdAt,
        vendorName: vendors.name,
        vendorCategory: vendors.category,
        vendorEmail: vendors.email,
        vendorPhone: vendors.phone,
      })
      .from(eventVendors)
      .leftJoin(vendors, eq(eventVendors.vendorId, vendors.id))
      .where(eq(eventVendors.eventId, eventIdNum));

    return NextResponse.json({ success: true, data: eventVendorsList });
  } catch (error) {
    console.error("GET /api/events/[eventId]/vendors error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch vendors";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/events/[eventId]/vendors - Add a vendor to an event
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(eventIdNum, "vendors", "view");
    const body = await request.json();

    const { vendorId, service, cost, notes } = body;

    if (!vendorId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Vendor ID is required" } },
        { status: 400 }
      );
    }

    // Verify event belongs to organization
    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.id, eventIdNum),
          eq(events.organizationId, session.organizationId)
        )
      );

    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Event not found" } },
        { status: 404 }
      );
    }

    const [eventVendor] = await db
      .insert(eventVendors)
      .values({
        eventId: eventIdNum,
        vendorId,
        service,
        cost: cost?.toString(),
        notes,
      })
      .returning();

    return NextResponse.json({ success: true, data: eventVendor });
  } catch (error) {
    console.error("POST /api/events/[eventId]/vendors error:", error);
    const message = error instanceof Error ? error.message : "Failed to add vendor";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[eventId]/vendors - Remove a vendor from an event
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(eventIdNum, "vendors", "view");
    const { searchParams } = new URL(request.url);
    const eventVendorId = searchParams.get("id");

    if (!eventVendorId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Event vendor ID is required" } },
        { status: 400 }
      );
    }

    // Verify event belongs to organization
    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.id, eventIdNum),
          eq(events.organizationId, session.organizationId)
        )
      );

    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Event not found" } },
        { status: 404 }
      );
    }

    await db
      .delete(eventVendors)
      .where(
        and(
          eq(eventVendors.id, parseInt(eventVendorId, 10)),
          eq(eventVendors.eventId, eventIdNum)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/events/[eventId]/vendors error:", error);
    const message = error instanceof Error ? error.message : "Failed to remove vendor";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 500 }
    );
  }
}
