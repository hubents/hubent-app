import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { listForms, createForm } from "@/lib/forms";
import { z, ZodError } from "zod";

export const dynamic = "force-dynamic";

const createFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(200),
  description: z.string().max(1000).optional(),
});

export async function GET() {
  try {
    const session = await requirePermission("forms:read");
    const result = await listForms(session.organizationId);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error interno";
    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return NextResponse.json({ success: false, error: message }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("forms:create");
    const body = await request.json();
    const parsed = createFormSchema.parse(body);

    const form = await createForm({
      organizationId: session.organizationId,
      name: parsed.name,
      description: parsed.description,
      createdBy: session.user.userId,
    });

    return NextResponse.json({ success: true, data: form }, { status: 201 });
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
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
