import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getForm } from "@/lib/forms";
import { getSubmissionById } from "@/lib/form-submissions";
import { getFormFields } from "@/lib/form-fields";
import { generateSubmissionHTML } from "@/lib/form-submission-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const session = await requirePermission("forms:read");
    const { id, submissionId } = await params;
    const formId = parseInt(id, 10);
    const subId = parseInt(submissionId, 10);

    if (isNaN(formId) || isNaN(subId)) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 });
    }

    const form = await getForm(formId, session.organizationId);
    if (!form) {
      return NextResponse.json({ success: false, error: "Formulario no encontrado" }, { status: 404 });
    }

    const submission = await getSubmissionById(subId);
    if (!submission || submission.formId !== formId) {
      return NextResponse.json({ success: false, error: "Respuesta no encontrada" }, { status: 404 });
    }

    const fields = await getFormFields(formId);
    const data = submission.data as Record<string, unknown>;

    const pdfFields = fields.map((f) => ({
      label: f.label,
      type: f.type,
      value: data[f.id.toString()] ?? data[f.label] ?? null,
      options: f.options,
    }));

    const html = generateSubmissionHTML({
      formName: form.name,
      formDescription: form.description,
      respondentName: submission.respondentName,
      respondentEmail: submission.respondentEmail,
      submittedAt: submission.createdAt || new Date(),
      fields: pdfFields,
    });

    const url = new URL(request.url);
    const format = url.searchParams.get("format");

    if (format === "html") {
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${form.name.replace(/[^a-zA-Z0-9]/g, "_")}_${subId}.html"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: message }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
