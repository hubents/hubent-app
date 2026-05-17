import { NextRequest } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { events, eventVendors, vendors } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, ok, created, badRequest, notFound } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/vendors - List vendors for an event
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
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
      return notFound("Event not found");
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
        contactEmail: vendors.email,
        contactPhone: vendors.phone,
      })
      .from(eventVendors)
      .leftJoin(vendors, eq(eventVendors.vendorId, vendors.id))
      .where(eq(eventVendors.eventId, eventIdNum));

    return ok(eventVendorsList);
  }, "GET /api/events/[eventId]/vendors");
}

// POST /api/events/[eventId]/vendors - Add a vendor to an event
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(eventIdNum, "vendors", "view");
    const body = await request.json();

    const { vendorId, service, cost, notes } = body;

    if (!vendorId) {
      return badRequest("Vendor ID is required");
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
      return notFound("Event not found");
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

    return created(eventVendor);
  }, "POST /api/events/[eventId]/vendors");
}

// DELETE /api/events/[eventId]/vendors - Remove a vendor from an event
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(eventIdNum, "vendors", "view");
    const { searchParams } = new URL(request.url);
    const eventVendorId = searchParams.get("id");

    if (!eventVendorId) {
      return badRequest("Event vendor ID is required");
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
      return notFound("Event not found");
    }

    await db
      .delete(eventVendors)
      .where(
        and(
          eq(eventVendors.id, parseInt(eventVendorId, 10)),
          eq(eventVendors.eventId, eventIdNum)
        )
      );

    return ok(null);
  }, "DELETE /api/events/[eventId]/vendors");
}
