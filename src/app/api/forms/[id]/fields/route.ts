import { requirePermission } from "@/lib/session";
import { getForm } from "@/lib/forms";
import { saveFormFields, getFormFields, type FieldInput } from "@/lib/form-fields";
import { z, ZodError } from "zod";
import { apiHandler, ok, notFound, badRequest, forbidden } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

const fieldSchema = z.object({
  id: z.number().optional(),
  type: z.string().min(1),
  label: z.string().min(1).max(200),
  placeholder: z.string().max(200).nullable().optional(),
  required: z.boolean().optional(),
  crmMapping: z.string().nullable().optional(),
  options: z.unknown().optional(),
  sortOrder: z.number().int().min(0),
  config: z.unknown().optional(),
});

const saveFieldsSchema = z.object({
  fields: z.array(fieldSchema).max(50, "Máximo 50 campos por formulario"),
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

    const fields = await getFormFields(formId);
    return ok(fields);
  }, "GET /api/forms/[id]/fields");
}

export async function PUT(
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

    const form = await getForm(formId, session.organizationId);
    if (!form) {
      return notFound("Formulario no encontrado");
    }

    if (form.status !== "draft") {
      return forbidden("No se pueden modificar campos de un formulario activo o pausado");
    }

    const body = await request.json();
    let parsed;
    try {
      parsed = saveFieldsSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest(error.issues[0]?.message || "Datos inválidos");
      }
      throw error;
    }

    const saved = await saveFormFields(formId, parsed.fields as FieldInput[]);
    return ok(saved);
  }, "PUT /api/forms/[id]/fields");
}
