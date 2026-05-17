import { NextRequest } from "next/server";
import { getFormInstanceBySlug } from "@/lib/form-instances";
import {
  createSubmission,
  extractCrmData,
  createLeadFromSubmission,
  linkSubmissionToLead,
  createContactFromSubmission,
  linkSubmissionToContact,
} from "@/lib/form-submissions";
import { apiHandler, ok, badRequest, notFound } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  return apiHandler(async () => {
    const { slug } = await params;

    if (!slug) {
      return badRequest("Slug requerido");
    }

    const instance = await getFormInstanceBySlug(slug);
    if (!instance || !instance.form) {
      return notFound("Formulario no encontrado");
    }

    if (instance.form.status !== "active") {
      return notFound("Formulario no disponible");
    }

    const body = await request.json();
    const data = body.data as Record<string, unknown>;
    if (!data || typeof data !== "object") {
      return badRequest("Datos requeridos");
    }

    // Validate required fields
    const fields = instance.form.fields || [];
    for (const field of fields) {
      if (field.required) {
        const value = data[field.label];
        if (value === undefined || value === null || value === "") {
          return badRequest(`El campo "${field.label}" es obligatorio`);
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

    // Create lead + contact in CRM based on form config
    const hasCrmData = crmData.name || crmData.email;
    const crmCreateLead = instance.form.crmCreateLead ?? true;
    const crmCreateContact = instance.form.crmCreateContact ?? true;

    if (hasCrmData && crmCreateLead) {
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
    }

    if (hasCrmData && crmCreateContact) {
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

    return ok({
      submissionId: submission.id,
      thankYouTitle: instance.form.thankYouTitle,
      thankYouMessage: instance.form.thankYouMessage,
      redirectUrl: instance.form.redirectUrl,
    });
  }, "POST /api/public/forms/[slug]/submit");
}
