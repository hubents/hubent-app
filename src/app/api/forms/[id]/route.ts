import { requirePermission } from "@/lib/session";
import { getForm, updateForm, deleteForm } from "@/lib/forms";
import { z, ZodError } from "zod";
import { apiHandler, ok, notFound, badRequest } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

const updateFormSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  primaryColor: z.string().max(20).optional(),
  submitButtonText: z.string().max(100).optional(),
  thankYouTitle: z.string().max(200).optional(),
  thankYouMessage: z.string().max(1000).optional(),
  redirectUrl: z.string().nullable().optional(),
  defaultEventType: z.string().nullable().optional(),
  notifyOnResponse: z.boolean().optional(),
  notifyEmail: z.string().email().nullable().optional(),
  gdprEnabled: z.boolean().optional(),
  gdprText: z.string().max(500).optional(),
  gdprLink: z.string().nullable().optional(),
  crmCreateContact: z.boolean().optional(),
  crmCreateLead: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("forms:read");
    const { id } = await params;
    const formId = parseInt(id, 10);
    if (isNaN(formId)) {
      return badRequest("ID inválido");
    }

    const form = await getForm(formId, session.organizationId);
    if (!form) {
      return notFound("Formulario no encontrado");
    }

    return ok(form);
  }, "GET /api/forms/[id]");
}

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
      parsed = updateFormSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest(error.issues[0]?.message || "Datos inválidos");
      }
      throw error;
    }

    const updated = await updateForm(formId, session.organizationId, parsed);
    if (!updated) {
      return notFound("Formulario no encontrado");
    }

    return ok(updated);
  }, "PATCH /api/forms/[id]");
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("forms:delete");
    const { id } = await params;
    const formId = parseInt(id, 10);
    if (isNaN(formId)) {
      return badRequest("ID inválido");
    }

    const deleted = await deleteForm(formId, session.organizationId);
    if (!deleted) {
      return notFound("Formulario no encontrado");
    }

    return ok(null);
  }, "DELETE /api/forms/[id]");
}
