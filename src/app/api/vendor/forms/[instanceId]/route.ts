import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { formInstances, forms, formFields, providerEventAccess } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const session = await requireAuth();

    if (session.orgType !== "provider") {
      return NextResponse.json({ success: false, error: "Solo organizaciones proveedoras" }, { status: 403 });
    }

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
        eq(providerEventAccess.status, "active")
      ),
    });
    if (!access) {
      return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        instanceId: instance.id,
        form: {
          id: instance.form.id,
          name: instance.form.name,
          description: instance.form.description,
          primaryColor: instance.form.primaryColor,
          submitButtonText: instance.form.submitButtonText,
          thankYouTitle: instance.form.thankYouTitle,
          thankYouMessage: instance.form.thankYouMessage,
          gdprEnabled: instance.form.gdprEnabled,
          gdprText: instance.form.gdprText,
          gdprLink: instance.form.gdprLink,
          fields: instance.form.fields,
        },
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
