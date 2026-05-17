import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { getTaskFormInstances } from "@/lib/form-instances";
import { canAccessTask } from "@/lib/tenant";
import { apiHandler, ok, badRequest, forbidden } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:read");
    const { taskId } = await params;
    const id = parseInt(taskId, 10);

    if (isNaN(id)) {
      return badRequest("ID inválido");
    }

    if (session.eventScoped) {
      const access = await canAccessTask(session, id);
      if (!access.allowed) {
        return forbidden("Acceso denegado");
      }
    }

    const instances = await getTaskFormInstances(id, session.organizationId);
    return ok(instances);
  }, "GET /api/tasks/[taskId]/forms");
}
