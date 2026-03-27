import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { providerEventAccess, formInstances, forms, formFields } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { isMarketplaceType } from "@/lib/tenant-type";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ accessId: string }> }
) {
  try {
    const session = await requireAuth();

    if (!isMarketplaceType(session.orgType)) {
      return NextResponse.json({ success: false, error: "Solo organizaciones proveedoras" }, { status: 403 });
    }

    const { accessId } = await params;
    const accessIdNum = parseInt(accessId, 10);
    if (isNaN(accessIdNum)) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 });
    }

    // Verify the vendor has access to this event
    const access = await db.query.providerEventAccess.findFirst({
      where: and(
        eq(providerEventAccess.id, accessIdNum),
        eq(providerEventAccess.providerOrgId, session.organizationId)
      ),
    });

    if (!access || access.status !== "active") {
      return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
    }

    // Get form instances linked to tasks for this event's organization
    const instances = await db
      .select({
        id: formInstances.id,
        type: formInstances.type,
        slug: formInstances.slug,
        taskId: formInstances.taskId,
        status: formInstances.status,
        formId: forms.id,
        formName: forms.name,
        formDescription: forms.description,
        formStatus: forms.status,
      })
      .from(formInstances)
      .innerJoin(forms, eq(forms.id, formInstances.formId))
      .where(
        and(
          eq(formInstances.organizationId, access.plannerOrgId),
          eq(formInstances.type, "task"),
          eq(formInstances.status, "active"),
          eq(forms.status, "active")
        )
      );

    return NextResponse.json({ success: true, data: instances });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
