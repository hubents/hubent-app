import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { duplicateForm } from "@/lib/forms";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("forms:create");
    const { id } = await params;
    const formId = parseInt(id, 10);
    if (isNaN(formId)) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 });
    }

    const newForm = await duplicateForm(formId, session.organizationId, session.user.userId);
    if (!newForm) {
      return NextResponse.json({ success: false, error: "Formulario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: newForm }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: message }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
