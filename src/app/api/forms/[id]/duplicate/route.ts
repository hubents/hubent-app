import { requirePermission } from "@/lib/session";
import { duplicateForm } from "@/lib/forms";
import { apiHandler, created, notFound, badRequest } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("forms:create");
    const { id } = await params;
    const formId = parseInt(id, 10);
    if (isNaN(formId)) {
      return badRequest("ID inválido");
    }

    const newForm = await duplicateForm(formId, session.organizationId, session.user.userId);
    if (!newForm) {
      return notFound("Formulario no encontrado");
    }

    return created(newForm);
  }, "POST /api/forms/[id]/duplicate");
}
