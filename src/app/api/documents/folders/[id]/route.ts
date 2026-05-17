import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { orgDocumentFolders } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, ok, notFound, badRequest } from "@/lib/api-handler";

type Params = { params: Promise<{ id: string }> };

async function findFolder(id: number, organizationId: number) {
  return db.query.orgDocumentFolders.findFirst({
    where: (f, { eq, and }) => and(eq(f.id, id), eq(f.organizationId, organizationId)),
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requirePermission("events:read");
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest("ID inválido");

    const folder = await findFolder(id, session.organizationId);
    if (!folder) return notFound("Carpeta no encontrada");

    const body = await request.json();
    const { name, color } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;

    const [updated] = await db.update(orgDocumentFolders)
      .set(updateData)
      .where(and(eq(orgDocumentFolders.id, id), eq(orgDocumentFolders.organizationId, session.organizationId)))
      .returning();

    return ok(updated);
  }, "PATCH /api/documents/folders/[id]");
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requirePermission("events:read");
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest("ID inválido");

    const folder = await findFolder(id, session.organizationId);
    if (!folder) return notFound("Carpeta no encontrada");

    // Files inside will have folderId set to null (onDelete: "set null")
    await db.delete(orgDocumentFolders)
      .where(and(eq(orgDocumentFolders.id, id), eq(orgDocumentFolders.organizationId, session.organizationId)));

    return ok({ message: "Carpeta eliminada" });
  }, "DELETE /api/documents/folders/[id]");
}
