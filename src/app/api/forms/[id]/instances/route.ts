import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getForm } from "@/lib/forms";
import { listFormInstances, createFormInstance, generateSlug } from "@/lib/form-instances";
import { z, ZodError } from "zod";

export const dynamic = "force-dynamic";

const createInstanceSchema = z.object({
  type: z.enum(["landing", "task"]),
  slug: z.string().max(60).optional(),
  eventId: z.number().int().positive().optional(),
  taskId: z.number().int().positive().optional(),
}).refine(
  (data) => {
    if (data.type === "task" && !data.taskId) return false;
    return true;
  },
  { message: "taskId es requerido para instancias de tipo 'task'" }
);

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

    const instances = await listFormInstances(formId);
    return NextResponse.json({ success: true, data: instances });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: message }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("forms:update");
    const { id } = await params;
    const formId = parseInt(id, 10);
    if (isNaN(formId)) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 });
    }

    const form = await getForm(formId, session.organizationId);
    if (!form) {
      return NextResponse.json({ success: false, error: "Formulario no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createInstanceSchema.parse(body);

    const slug = parsed.type === "landing"
      ? (parsed.slug || generateSlug(form.name))
      : null;

    const instance = await createFormInstance({
      formId,
      organizationId: session.organizationId,
      type: parsed.type,
      slug,
      eventId: parsed.eventId ?? null,
      taskId: parsed.taskId ?? null,
      createdBy: session.user.userId,
    });

    return NextResponse.json({ success: true, data: instance }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Error interno";
    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: message }, { status: 403 });
    }
    if (message.includes("duplicate key") || message.includes("unique constraint")) {
      return NextResponse.json(
        { success: false, error: "Ya existe una instancia con este slug o tarea" },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
