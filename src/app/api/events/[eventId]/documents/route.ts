import { NextRequest } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { events, eventDocuments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { deleteR2ByUrl } from "@/lib/r2";
import { apiHandler, ok, notFound, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/documents - List documents for an event
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(eventIdNum, "general", "view");

    // Verify event belongs to organization
    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventIdNum), eq(events.organizationId, session.organizationId)));

    if (!event) {
      return notFound("Event not found");
    }

    const documents = await db
      .select()
      .from(eventDocuments)
      .where(eq(eventDocuments.eventId, eventIdNum));

    return ok(documents);
  }, "GET /api/events/[eventId]/documents");
}

// POST /api/events/[eventId]/documents - Add a document to an event
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(eventIdNum, "general", "edit");
    const body = await request.json();

    const { name, url, type = "document" } = body;

    if (!name || !url) {
      return badRequest("Name and URL are required");
    }

    // Verify event belongs to organization
    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventIdNum), eq(events.organizationId, session.organizationId)));

    if (!event) {
      return notFound("Event not found");
    }

    const [document] = await db
      .insert(eventDocuments)
      .values({
        eventId: eventIdNum,
        type,
        name,
        url,
        uploadedBy: session.user.userId,
      })
      .returning();

    return ok(document);
  }, "POST /api/events/[eventId]/documents");
}

// DELETE /api/events/[eventId]/documents - Remove a document
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(eventIdNum, "general", "edit");
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return badRequest("Document ID is required");
    }

    // Verify event belongs to organization
    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventIdNum), eq(events.organizationId, session.organizationId)));

    if (!event) {
      return notFound("Event not found");
    }

    const [doc] = await db
      .select({ url: eventDocuments.url })
      .from(eventDocuments)
      .where(eq(eventDocuments.id, parseInt(documentId, 10)));

    await db
      .delete(eventDocuments)
      .where(eq(eventDocuments.id, parseInt(documentId, 10)));

    if (doc?.url) {
      deleteR2ByUrl(doc.url);
    }

    return ok(null);
  }, "DELETE /api/events/[eventId]/documents");
}
