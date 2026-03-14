import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getForm, updateForm, deleteForm } from "@/lib/forms";
import { z, ZodError } from "zod";

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

    return NextResponse.json({ success: true, data: form });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: message }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
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

    const body = await request.json();
    const parsed = updateFormSchema.parse(body);

    const updated = await updateForm(formId, session.organizationId, parsed);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Formulario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("forms:delete");
    const { id } = await params;
    const formId = parseInt(id, 10);
    if (isNaN(formId)) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 });
    }

    const deleted = await deleteForm(formId, session.organizationId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Formulario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: message }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
