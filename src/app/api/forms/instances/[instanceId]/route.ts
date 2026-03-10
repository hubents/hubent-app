import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { deleteFormInstance } from "@/lib/form-instances";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const session = await requirePermission("forms:update");
    const { instanceId } = await params;
    const id = parseInt(instanceId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 });
    }

    const deleted = await deleteFormInstance(id, session.organizationId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Instancia no encontrada" }, { status: 404 });
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
