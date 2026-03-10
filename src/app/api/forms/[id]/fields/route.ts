import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getForm } from "@/lib/forms";
import { saveFormFields, getFormFields, type FieldInput } from "@/lib/form-fields";
import { z, ZodError } from "zod";

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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("forms:read");
    const { id } = await params;
    const formId = parseInt(id, 10);
    if (isNaN(formId)) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 });
    }

    const form = await getForm(formId, session.organizationId);
    if (!form) {
      return NextResponse.json({ success: false, error: "Formulario no encontrado" }, { status: 404 });
    }

    const fields = await getFormFields(formId);
    return NextResponse.json({ success: true, data: fields });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: message }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("forms:update");
    const { id } = await params;
    const formId = parseInt(id, 10);
    if (isNaN(formId)) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 });
    }

    const form = await getForm(formId, session.organizationId);
    if (!form) {
      return NextResponse.json({ success: false, error: "Formulario no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = saveFieldsSchema.parse(body);

    const saved = await saveFormFields(formId, parsed.fields as FieldInput[]);
    return NextResponse.json({ success: true, data: saved });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Error interno";
    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: message }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
