import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { orgDocuments, orgDocumentFolders, users } from "@/db/schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { apiHandler, ok, created, badRequest } from "@/lib/api-handler";

export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("events:read");
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");
    const eventId = searchParams.get("eventId");

    const conditions = [eq(orgDocuments.organizationId, session.organizationId)];
    if (folderId) {
      conditions.push(eq(orgDocuments.folderId, parseInt(folderId, 10)));
    }
    if (eventId) {
      conditions.push(eq(orgDocuments.eventId, parseInt(eventId, 10)));
    }

    const docs = await db
      .select({
        id: orgDocuments.id,
        name: orgDocuments.name,
        fileType: orgDocuments.fileType,
        fileSize: orgDocuments.fileSize,
        storageKey: orgDocuments.storageKey,
        storageUrl: orgDocuments.storageUrl,
        folderId: orgDocuments.folderId,
        folderName: orgDocumentFolders.name,
        eventId: orgDocuments.eventId,
        tags: orgDocuments.tags,
        uploadedBy: orgDocuments.uploadedBy,
        uploaderName: sql<string>`${users.name}`,
        createdAt: orgDocuments.createdAt,
        updatedAt: orgDocuments.updatedAt,
      })
      .from(orgDocuments)
      .leftJoin(orgDocumentFolders, eq(orgDocuments.folderId, orgDocumentFolders.id))
      .leftJoin(users, eq(orgDocuments.uploadedBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(orgDocuments.createdAt));

    return ok(docs);
  }, "GET /api/documents");
}

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("events:read");
    const body = await request.json();
    const { name, fileType, fileSize, storageKey, storageUrl, folderId, eventId, tags } = body;

    if (!name?.trim()) return badRequest("name es obligatorio");
    if (!storageUrl) return badRequest("storageUrl es obligatorio");

    const [doc] = await db.insert(orgDocuments).values({
      organizationId: session.organizationId,
      name: name.trim(),
      fileType: fileType || null,
      fileSize: fileSize ? Number(fileSize) : null,
      storageKey: storageKey || null,
      storageUrl,
      folderId: folderId ? Number(folderId) : null,
      eventId: eventId ? Number(eventId) : null,
      uploadedBy: session.user.userId,
      tags: tags || [],
    }).returning();

    return created(doc);
  }, "POST /api/documents");
}
