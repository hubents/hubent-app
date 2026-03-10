import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getForm } from "@/lib/forms";
import { getSubmissionsByForm } from "@/lib/form-submissions";

export const dynamic = "force-dynamic";

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

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const { rows, total } = await getSubmissionsByForm(formId, limit, offset);

    return NextResponse.json({
      success: true,
      data: rows,
      meta: { total, limit, offset },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: message }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
