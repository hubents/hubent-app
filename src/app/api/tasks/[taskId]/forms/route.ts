import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getTaskFormInstances } from "@/lib/form-instances";
import { canAccessTask } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await requirePermission("tasks:read");
    const { taskId } = await params;
    const id = parseInt(taskId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 });
    }

    if (session.eventScoped) {
      const access = await canAccessTask(session, id);
      if (!access.allowed) {
        return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
      }
    }

    const instances = await getTaskFormInstances(id, session.organizationId);
    return NextResponse.json({ success: true, data: instances });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: message }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
