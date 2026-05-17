import { requirePermission } from "@/lib/session";
import { deleteFormInstance } from "@/lib/form-instances";
import { apiHandler, badRequest, notFound, ok } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("forms:update");
    const { instanceId } = await params;
    const id = parseInt(instanceId, 10);
    if (isNaN(id)) return badRequest("ID inválido");

    const deleted = await deleteFormInstance(id, session.organizationId);
    if (!deleted) return notFound("Instancia no encontrada");

    return ok(null);
  }, "DELETE /api/forms/instances/[instanceId]");
}
