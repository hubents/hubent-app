import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { leadTodoTemplates } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { apiHandler, ok, created, badRequest, notFound } from "@/lib/api-handler";

// GET — list all templates for the org
export async function GET(_req: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:read");

    const templates = await db
      .select()
      .from(leadTodoTemplates)
      .where(eq(leadTodoTemplates.organizationId, session.organizationId))
      .orderBy(asc(leadTodoTemplates.sortOrder), asc(leadTodoTemplates.createdAt));

    return ok(templates);
  }, "GET /api/crm/leads/todo-templates");
}

// POST — add a template item
export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const body = await req.json().catch(() => null);
    const text = String(body?.text || "").trim();
    if (!text) return badRequest("text es obligatorio");

    const [item] = await db
      .insert(leadTodoTemplates)
      .values({
        organizationId: session.organizationId,
        text,
        sortOrder: body?.sortOrder ?? 0,
      })
      .returning();

    return created(item);
  }, "POST /api/crm/leads/todo-templates");
}

// PATCH — update a template item (text / sortOrder)
export async function PATCH(req: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const body = await req.json().catch(() => null);
    const id = Number(body?.id);
    if (!id) return badRequest("id es obligatorio");

    const updates: Partial<{ text: string; sortOrder: number }> = {};
    if (body?.text !== undefined) updates.text = String(body.text).trim();
    if (body?.sortOrder !== undefined) updates.sortOrder = Number(body.sortOrder);

    const [updated] = await db
      .update(leadTodoTemplates)
      .set(updates)
      .where(and(eq(leadTodoTemplates.id, id), eq(leadTodoTemplates.organizationId, session.organizationId)))
      .returning();

    if (!updated) return notFound("Template no encontrado");
    return ok(updated);
  }, "PATCH /api/crm/leads/todo-templates");
}

// DELETE — remove a template item
export async function DELETE(req: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const { searchParams } = req.nextUrl;
    const id = parseInt(searchParams.get("id") || "");
    if (isNaN(id)) return badRequest("id es obligatorio");

    await db
      .delete(leadTodoTemplates)
      .where(and(eq(leadTodoTemplates.id, id), eq(leadTodoTemplates.organizationId, session.organizationId)));

    return ok(null);
  }, "DELETE /api/crm/leads/todo-templates");
}
