import { NextRequest } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { getDocument } from "@/lib/finance";
import { apiHandler, badRequest, notFound, forbidden, ok } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string; documentId: string }> };

// GET /api/events/[eventId]/documents/finance/[documentId] - Get single financial document
// Uses event-level permission check for eventScoped users with finances:view
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId: eventIdStr, documentId: documentIdStr } = await params;
    const eventId = parseInt(eventIdStr, 10);
    const documentId = parseInt(documentIdStr, 10);

    if (isNaN(eventId) || isNaN(documentId)) {
      return badRequest("Invalid eventId or documentId");
    }

    const session = await requireEventSectionAccess(eventId, "finances", "view");

    const document = await getDocument(session, documentId);

    if (!document) {
      return notFound("Document not found");
    }

    // Verify document belongs to this event
    if (document.eventId !== eventId) {
      return forbidden("Document does not belong to this event");
    }

    return ok(document);
  }, "GET /api/events/[eventId]/documents/finance/[documentId]");
}
