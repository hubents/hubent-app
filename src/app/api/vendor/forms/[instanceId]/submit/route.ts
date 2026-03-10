import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { formInstances, formFields, providerEventAccess } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import {
  createSubmission,
  extractCrmData,
} from "@/lib/form-submissions";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const session = await requireAuth();
    const { instanceId } = await params;
    const id = parseInt(instanceId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 });
    }

    const instance = await db.query.formInstances.findFirst({
      where: eq(formInstances.id, id),
      with: {
        form: {
          with: {
            fields: { orderBy: [asc(formFields.sortOrder)] },
          },
        },
      },
    });

    if (!instance || !instance.form || instance.form.status !== "active") {
      return NextResponse.json({ success: false, error: "Formulario no encontrado" }, { status: 404 });
    }

    // Verify vendor has access to this form's organization
    const access = await db.query.providerEventAccess.findFirst({
      where: and(
        eq(providerEventAccess.providerOrgId, session.organizationId),
        eq(providerEventAccess.plannerOrgId, instance.organizationId),
        eq(providerEventAccess.status, "accepted")
      ),
    });
    if (!access) {
      return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
    }

    const body = await request.json();
    const data = body.data as Record<string, unknown>;
    if (!data || typeof data !== "object") {
      return NextResponse.json({ success: false, error: "Datos requeridos" }, { status: 400 });
    }

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

    const crmData = extractCrmData(fields, data);

    const submission = await createSubmission({
      instanceId: instance.id,
      formId: instance.form.id,
      data,
      respondentName: crmData.name || session.user?.name || null,
      respondentEmail: crmData.email || session.user?.email || null,
      respondentUserId: session.user?.userId || null,
    });

    return NextResponse.json({
      success: true,
      data: {
        submissionId: submission.id,
        thankYouTitle: instance.form.thankYouTitle,
        thankYouMessage: instance.form.thankYouMessage,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
