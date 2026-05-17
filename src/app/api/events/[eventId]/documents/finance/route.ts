import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { getDocuments } from "@/lib/finance";
import { apiHandler, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/documents/finance - List financial documents for an event
// Uses event-level permission check (requireEventSectionAccess) instead of org-level (requirePermission)
// This allows eventScoped users with finances:view to see documents
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  return apiHandler(async () => {
    const { eventId: eventIdStr } = await params;
    const eventId = parseInt(eventIdStr, 10);
    if (isNaN(eventId)) {
      return badRequest("Invalid eventId");
    }

    const session = await requireEventSectionAccess(eventId, "finances", "view");

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const type = searchParams.get("type") || undefined;
    const status = searchParams.get("status") || undefined;
    const direction = searchParams.get("direction") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await getDocuments(session, { page, limit, type, status, direction, search, eventId });

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  }, "GET /api/events/[eventId]/documents/finance");
}
