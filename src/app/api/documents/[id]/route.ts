import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { orgDocuments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, ok, notFound, badRequest } from "@/lib/api-handler";
import { deleteFromR2 } from "@/lib/r2";

type Params = { params: Promise<{ id: string }> };

async function findDoc(id: number, organizationId: number) {
  return db.query.orgDocuments.findFirst({
    where: (d, { eq, and }) => and(eq(d.id, id), eq(d.organizationId, organizationId)),
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requirePermission("events:read");
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest("ID inválido");

    const doc = await findDoc(id, session.organizationId);
    if (!doc) return notFound("Documento no encontrado");

    const body = await request.json();
    const { name, folderId, tags } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (folderId !== undefined) updateData.folderId = folderId ? Number(folderId) : null;
    if (tags !== undefined) updateData.tags = tags;

    const [updated] = await db.update(orgDocuments)
      .set(updateData)
      .where(and(eq(orgDocuments.id, id), eq(orgDocuments.organizationId, session.organizationId)))
      .returning();

    return ok(updated);
  }, "PATCH /api/documents/[id]");
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requirePermission("events:read");
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest("ID inválido");

    const doc = await findDoc(id, session.organizationId);
    if (!doc) return notFound("Documento no encontrado");

    // Delete from R2 if there's a storage key
    if (doc.storageKey) {
      try {
        await deleteFromR2(doc.storageKey);
      } catch {
        // Log but don't fail if R2 deletion fails
      }
    }

    await db.delete(orgDocuments)
      .where(and(eq(orgDocuments.id, id), eq(orgDocuments.organizationId, session.organizationId)));

    return ok({ message: "Documento eliminado" });
  }, "DELETE /api/documents/[id]");
}
