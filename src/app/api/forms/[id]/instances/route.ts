import { requirePermission } from "@/lib/session";
import { getForm } from "@/lib/forms";
import { listFormInstances, createFormInstance, generateSlug } from "@/lib/form-instances";
import { z, ZodError } from "zod";
import { apiHandler, ok, badRequest, notFound, conflict, created } from "@/lib/api-handler";

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
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("forms:read");
    const { id } = await params;
    const formId = parseInt(id, 10);
    if (isNaN(formId)) return badRequest("ID inválido");

    const form = await getForm(formId, session.organizationId);
    if (!form) return notFound("Formulario no encontrado");

    const instances = await listFormInstances(formId);
    return ok(instances);
  }, "GET /api/forms/[id]/instances");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("forms:update");
    const { id } = await params;
    const formId = parseInt(id, 10);
    if (isNaN(formId)) return badRequest("ID inválido");

    const form = await getForm(formId, session.organizationId);
    if (!form) return notFound("Formulario no encontrado");

    let parsed: z.infer<typeof createInstanceSchema>;
    try {
      const body = await request.json();
      parsed = createInstanceSchema.parse(body);
    } catch (err) {
      if (err instanceof ZodError) {
        return badRequest(err.issues[0]?.message || "Datos inválidos");
      }
      throw err;
    }

    // Both 'landing' and 'task' instances get a slug so the public form
    // (/f/{slug}) is reachable. Task instances expose the slug to internal
    // users (TaskFormsTab) who click through to fill the form.
    const slug = parsed.slug || generateSlug(form.name);

    try {
      const instance = await createFormInstance({
        formId,
        organizationId: session.organizationId,
        type: parsed.type,
        slug,
        eventId: parsed.eventId ?? null,
        taskId: parsed.taskId ?? null,
        createdBy: session.user.userId,
      });
      return created(instance);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
        return conflict("Ya existe una instancia con este slug o tarea");
      }
      throw err;
    }
  }, "POST /api/forms/[id]/instances");
}
