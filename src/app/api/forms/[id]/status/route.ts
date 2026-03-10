import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { updateFormStatus } from "@/lib/forms";
import { z, ZodError } from "zod";

export const dynamic = "force-dynamic";

const statusSchema = z.object({
  status: z.enum(["draft", "active", "paused"]),
});

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
    const parsed = statusSchema.parse(body);

    const updated = await updateFormStatus(formId, session.organizationId, parsed.status);
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
