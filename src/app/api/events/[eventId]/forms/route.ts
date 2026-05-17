import { requirePermission } from "@/lib/session";
import { getEventFormInstances } from "@/lib/form-instances";
import { canAccessEvent } from "@/lib/tenant";
import { apiHandler, ok, badRequest, forbidden } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("forms:read");
    const { eventId } = await params;
    const id = parseInt(eventId, 10);
    if (isNaN(id)) {
      return badRequest("ID inválido");
    }

    // Verify eventScoped users can access this event
    if (session.eventScoped) {
      const check = await canAccessEvent(session, id);
      if (!check.allowed) {
        return forbidden("Acceso denegado");
      }
    }

    const instances = await getEventFormInstances(id, session.organizationId);
    return ok(instances);
  }, "GET /api/events/[eventId]/forms");
}
