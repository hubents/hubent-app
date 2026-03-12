import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getEventFormInstances } from "@/lib/form-instances";
import { canAccessEvent } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await requirePermission("forms:read");
    const { eventId } = await params;
    const id = parseInt(eventId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 });
    }

    // Verify eventScoped users can access this event
    if (session.eventScoped) {
      const check = await canAccessEvent(session, id);
      if (!check.allowed) {
        return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
      }
    }

    const instances = await getEventFormInstances(id, session.organizationId);
    return NextResponse.json({ success: true, data: instances });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: message }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
