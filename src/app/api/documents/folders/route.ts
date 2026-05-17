import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { orgDocumentFolders, orgDocuments } from "@/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { apiHandler, ok, created, badRequest } from "@/lib/api-handler";

export async function GET(_request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("events:read");

    const folders = await db
      .select({
        id: orgDocumentFolders.id,
        name: orgDocumentFolders.name,
        color: orgDocumentFolders.color,
        sortOrder: orgDocumentFolders.sortOrder,
        createdAt: orgDocumentFolders.createdAt,
        fileCount: sql<number>`(SELECT COUNT(*) FROM org_documents WHERE folder_id = ${orgDocumentFolders.id})`,
      })
      .from(orgDocumentFolders)
      .where(eq(orgDocumentFolders.organizationId, session.organizationId))
      .orderBy(asc(orgDocumentFolders.sortOrder), asc(orgDocumentFolders.name));

    return ok(folders);
  }, "GET /api/documents/folders");
}

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("events:read");
    const body = await request.json();
    const { name, color, sortOrder } = body;

    if (!name?.trim()) return badRequest("name es obligatorio");

    const [folder] = await db.insert(orgDocumentFolders).values({
      organizationId: session.organizationId,
      name: name.trim(),
      color: color || "#7FA890",
      sortOrder: sortOrder || 0,
    }).returning();

    return created(folder);
  }, "POST /api/documents/folders");
}
