import { NextResponse } from "next/server";
import { getFormInstanceBySlug } from "@/lib/form-instances";
import {
  createSubmission,
  extractCrmData,
  createLeadFromSubmission,
  linkSubmissionToLead,
  createContactFromSubmission,
  linkSubmissionToContact,
} from "@/lib/form-submissions";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ success: false, error: "Slug requerido" }, { status: 400 });
    }

    const instance = await getFormInstanceBySlug(slug);
    if (!instance || !instance.form) {
      return NextResponse.json({ success: false, error: "Formulario no encontrado" }, { status: 404 });
    }

    if (instance.form.status !== "active") {
      return NextResponse.json({ success: false, error: "Formulario no disponible" }, { status: 404 });
    }

    const body = await request.json();
    const data = body.data as Record<string, unknown>;
    if (!data || typeof data !== "object") {
      return NextResponse.json({ success: false, error: "Datos requeridos" }, { status: 400 });
    }

    // Validate required fields
    const fields = instance.form.fields || [];
    for (const field of fields) {
      if (field.required) {
        const value = data[field.label];
        if (value === undefined || value === null || value === "") {
          return NextResponse.json(
            { success: false, error: `El campo "${field.label}" es obligatorio` },
            { status: 400 }
          );
        }
      }
    }

    // Extract CRM data
    const crmData = extractCrmData(fields, data);

    // Get IP and User Agent
    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
    const userAgent = request.headers.get("user-agent") || null;

    // Create submission
    const submission = await createSubmission({
      instanceId: instance.id,
      formId: instance.form.id,
      data,
      respondentName: crmData.name || null,
      respondentEmail: crmData.email || null,
      ipAddress,
      userAgent,
    });

    // Create lead + contact in CRM (for landing instances)
    if (instance.type === "landing" && (crmData.name || crmData.email)) {
      try {
        const leadId = await createLeadFromSubmission(
          instance.organizationId,
          crmData,
          `form:${instance.form.name}`
        );
        await linkSubmissionToLead(submission.id, leadId);
      } catch {
        // Don't fail the submission if lead creation fails
      }

      try {
        const contactId = await createContactFromSubmission(
          instance.organizationId,
          crmData,
          `form:${instance.form.name}`
        );
        await linkSubmissionToContact(submission.id, contactId);
      } catch {
        // Don't fail the submission if contact creation fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        submissionId: submission.id,
        thankYouTitle: instance.form.thankYouTitle,
        thankYouMessage: instance.form.thankYouMessage,
        redirectUrl: instance.form.redirectUrl,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
