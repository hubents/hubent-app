import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { leadTodos, leads, users } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { apiHandler, ok, created, badRequest, notFound } from "@/lib/api-handler";

type Params = { params: Promise<{ leadId: string }> };

async function getLeadAndVerifyAccess(leadId: number, organizationId: number) {
  const lead = await db.query.leads.findFirst({
    where: and(eq(leads.id, leadId), eq(leads.organizationId, organizationId)),
    columns: { id: true },
  });
  return lead;
}

async function withAssignee(todos: (typeof leadTodos.$inferSelect)[]) {
  const userIds = [...new Set(todos.map((t) => t.assignedTo).filter(Boolean) as string[])];
  if (userIds.length === 0) return todos.map((t) => ({ ...t, assignedUserName: null, assignedUserImage: null }));

  const memberRows = await db
    .select({ id: users.id, name: users.name, image: users.image })
    .from(users)
    .where(eq(users.id, userIds[0])); // simple loop below

  const allMembers = await Promise.all(
    userIds.map((id) =>
      db.select({ id: users.id, name: users.name, image: users.image }).from(users).where(eq(users.id, id)).then((r) => r[0])
    )
  );
  const map = new Map(allMembers.filter(Boolean).map((u) => [u.id, u]));

  return todos.map((t) => {
    const u = t.assignedTo ? map.get(t.assignedTo) : undefined;
    return { ...t, assignedUserName: u?.name ?? null, assignedUserImage: u?.image ?? null };
  });
}

export async function GET(_req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { leadId: leadIdStr } = await params;
    const leadId = parseInt(leadIdStr);
    if (isNaN(leadId)) return badRequest("ID inválido", "INVALID_ID");

    const lead = await getLeadAndVerifyAccess(leadId, session.organizationId);
    if (!lead) return notFound("Lead no encontrado");

    const todos = await db
      .select()
      .from(leadTodos)
      .where(and(eq(leadTodos.leadId, leadId), eq(leadTodos.organizationId, session.organizationId)))
      .orderBy(asc(leadTodos.sortOrder), asc(leadTodos.createdAt));

    return ok(await withAssignee(todos));
  }, "GET /api/crm/leads/[leadId]/todos");
}

export async function POST(req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { leadId: leadIdStr } = await params;
    const leadId = parseInt(leadIdStr);
    if (isNaN(leadId)) return badRequest("ID inválido", "INVALID_ID");

    const lead = await getLeadAndVerifyAccess(leadId, session.organizationId);
    if (!lead) return notFound("Lead no encontrado");

    const body = await req.json().catch(() => null);
    const text = String(body?.text || "").trim();
    if (!text) return badRequest("text es obligatorio");

    const [todo] = await db
      .insert(leadTodos)
      .values({
        leadId,
        organizationId: session.organizationId,
        text,
        done: false,
        sortOrder: body?.sortOrder ?? 0,
        assignedTo: body?.assignedTo ?? null,
      })
      .returning();

    const [enriched] = await withAssignee([todo]);
    return created(enriched);
  }, "POST /api/crm/leads/[leadId]/todos");
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { leadId: leadIdStr } = await params;
    const leadId = parseInt(leadIdStr);
    if (isNaN(leadId)) return badRequest("ID inválido", "INVALID_ID");

    const body = await req.json().catch(() => null);
    const todoId = Number(body?.id);
    if (!todoId) return badRequest("id del todo es obligatorio");

    const updateData: Partial<{ text: string; done: boolean; sortOrder: number; assignedTo: string | null; updatedAt: Date }> = {
      updatedAt: new Date(),
    };
    if (body?.text !== undefined) updateData.text = String(body.text).trim();
    if (body?.done !== undefined) updateData.done = Boolean(body.done);
    if (body?.sortOrder !== undefined) updateData.sortOrder = Number(body.sortOrder);
    if ("assignedTo" in body) updateData.assignedTo = body.assignedTo ?? null;

    const [updated] = await db
      .update(leadTodos)
      .set(updateData)
      .where(and(eq(leadTodos.id, todoId), eq(leadTodos.leadId, leadId), eq(leadTodos.organizationId, session.organizationId)))
      .returning();

    if (!updated) return notFound("Todo no encontrado");

    const [enriched] = await withAssignee([updated]);
    return ok(enriched);
  }, "PATCH /api/crm/leads/[leadId]/todos");
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { leadId: leadIdStr } = await params;
    const leadId = parseInt(leadIdStr);
    if (isNaN(leadId)) return badRequest("ID inválido", "INVALID_ID");

    const { searchParams } = req.nextUrl;
    const todoId = parseInt(searchParams.get("todoId") || "");
    if (isNaN(todoId)) return badRequest("todoId es obligatorio");

    await db
      .delete(leadTodos)
      .where(and(eq(leadTodos.id, todoId), eq(leadTodos.leadId, leadId), eq(leadTodos.organizationId, session.organizationId)));

    return ok(null);
  }, "DELETE /api/crm/leads/[leadId]/todos");
}
