import { requirePermission } from "@/lib/session";
import { listForms, createForm } from "@/lib/forms";
import { z, ZodError } from "zod";
import { apiHandler, ok, created, badRequest } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

const createFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(200),
  description: z.string().max(1000).optional(),
});

export async function GET() {
  return apiHandler(async () => {
    const session = await requirePermission("forms:read");
    const result = await listForms(session.organizationId);
    return ok(result);
  }, "GET /api/forms");
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const session = await requirePermission("forms:create");
    const body = await request.json();

    let parsed;
    try {
      parsed = createFormSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return badRequest(error.issues[0]?.message || "Datos inválidos");
      }
      throw error;
    }

    const form = await createForm({
      organizationId: session.organizationId,
      name: parsed.name,
      description: parsed.description,
      createdBy: session.user.userId,
    });

    return created(form);
  }, "POST /api/forms");
}
