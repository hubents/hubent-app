import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getForm } from "@/lib/forms";
import { getSubmissionsByForm } from "@/lib/form-submissions";
import { apiHandler, badRequest, notFound } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("forms:read");
    const { id } = await params;
    const formId = parseInt(id, 10);
    if (isNaN(formId)) return badRequest("ID inválido");

    const form = await getForm(formId, session.organizationId);
    if (!form) return notFound("Formulario no encontrado");

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const { rows, total } = await getSubmissionsByForm(formId, limit, offset);

    return NextResponse.json({
      success: true,
      data: rows,
      meta: { total, limit, offset },
    });
  }, "GET /api/forms/[id]/submissions");
}
