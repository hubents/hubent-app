import { requirePermission } from "@/lib/session";
import { updateFormStatus } from "@/lib/forms";
import { z, ZodError } from "zod";
import { apiHandler, ok, notFound, badRequest } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

const statusSchema = z.object({
  status: z.enum(["draft", "active", "paused"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("forms:update");
    const { id } = await params;
    const formId = parseInt(id, 10);
    if (isNaN(formId)) {
      return badRequest("ID inválido");
    }

    const body = await request.json();
    let parsed;
    try {
      parsed = statusSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest(error.issues[0]?.message || "Datos inválidos");
      }
      throw error;
    }

    const updated = await updateFormStatus(formId, session.organizationId, parsed.status);
    if (!updated) {
      return notFound("Formulario no encontrado");
    }

    return ok(updated);
  }, "PATCH /api/forms/[id]/status");
}
