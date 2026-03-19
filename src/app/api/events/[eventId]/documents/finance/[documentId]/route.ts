import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { getDocument } from "@/lib/finance";

type RouteParams = { params: Promise<{ eventId: string; documentId: string }> };

// GET /api/events/[eventId]/documents/finance/[documentId] - Get single financial document
// Uses event-level permission check for eventScoped users with finances:view
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId: eventIdStr, documentId: documentIdStr } = await params;
    const eventId = parseInt(eventIdStr, 10);
    const documentId = parseInt(documentIdStr, 10);

    if (isNaN(eventId) || isNaN(documentId)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid eventId or documentId" } },
        { status: 400 }
      );
    }

    const session = await requireEventSectionAccess(eventId, "finances", "view");

    const document = await getDocument(session, documentId);

    if (!document) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    // Verify document belongs to this event
    if (document.eventId !== eventId) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Document does not belong to this event" } },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch document";
    const status = message.includes("Forbidden") || message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}
