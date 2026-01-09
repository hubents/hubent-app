import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { events, taskAttachments } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/documents - List documents for an event
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("viewer");
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);

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

    // Get documents attached to this event (using taskAttachments with null taskId for event-level docs)
    // For now, we'll use a simple approach - documents linked to event tasks
    const documents = await db
      .select()
      .from(taskAttachments)
      .where(
        and(
          isNull(taskAttachments.taskId),
          eq(taskAttachments.type, "document")
        )
      );

    return NextResponse.json({ success: true, data: documents });
  } catch (error) {
    console.error("GET /api/events/[eventId]/documents error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch documents";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/events/[eventId]/documents - Add a document to an event
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const body = await request.json();

    const { name, url, type = "document" } = body;

    if (!name || !url) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name and URL are required" } },
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

    // Store document as attachment (we'll add eventId column later if needed)
    const [document] = await db
      .insert(taskAttachments)
      .values({
        taskId: null as unknown as number, // Event-level document
        type,
        name,
        url,
        uploadedBy: session.user.userId,
      })
      .returning();

    return NextResponse.json({ success: true, data: document });
  } catch (error) {
    console.error("POST /api/events/[eventId]/documents error:", error);
    const message = error instanceof Error ? error.message : "Failed to add document";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[eventId]/documents - Remove a document
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Document ID is required" } },
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
      .delete(taskAttachments)
      .where(eq(taskAttachments.id, parseInt(documentId, 10)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/events/[eventId]/documents error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete document";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 500 }
    );
  }
}
