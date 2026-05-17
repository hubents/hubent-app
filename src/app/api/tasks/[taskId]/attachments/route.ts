import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { taskAttachments } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { deleteR2ByUrl } from "@/lib/r2";
import { canAccessTaskFor } from "@/lib/task-access";
import { apiHandler, ok, badRequest, notFound, forbidden, created } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ taskId: string }> };

const HIGH_ROLES = new Set(["manager", "admin", "owner", "super_admin"]);

// GET /api/tasks/[taskId]/attachments - List task attachments (cross-org aware)
export async function GET(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { taskId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const access = await canAccessTaskFor({
      userId: session.user.userId,
      organizationId: session.organizationId,
      role: session.role,
      taskId: taskIdNum,
    });

    if (!access.canRead) {
      return notFound("Task not found");
    }

    let whereClause = eq(taskAttachments.taskId, taskIdNum);

    if (type) {
      whereClause = and(whereClause, eq(taskAttachments.type, type as "file" | "document" | "image" | "link"))!;
    }

    const attachments = await db
      .select()
      .from(taskAttachments)
      .where(whereClause)
      .orderBy(desc(taskAttachments.uploadedAt));

    return ok(attachments);
  }, "GET /api/tasks/[taskId]/attachments");
}

// POST /api/tasks/[taskId]/attachments - Add attachment to task (requires comment access)
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { taskId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    const body = await request.json();

    const { name, url, type, thumbnail, size, mimeType, messageId } = body;

    if (!name || !url) {
      return badRequest("name and url are required");
    }

    const access = await canAccessTaskFor({
      userId: session.user.userId,
      organizationId: session.organizationId,
      role: session.role,
      taskId: taskIdNum,
    });

    if (!access.canComment) {
      return forbidden("No tienes permiso para subir archivos a esta tarea");
    }

    const [attachment] = await db.insert(taskAttachments).values({
      taskId: taskIdNum,
      messageId,
      name,
      url,
      type: type || "file",
      thumbnail,
      size,
      mimeType,
      uploadedBy: session.user.userId,
    }).returning();

    return created(attachment);
  }, "POST /api/tasks/[taskId]/attachments");
}

// DELETE /api/tasks/[taskId]/attachments - Delete attachment (uploader or high-role within scope)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { taskId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get("attachmentId");

    if (!attachmentId) {
      return badRequest("attachmentId is required");
    }

    const access = await canAccessTaskFor({
      userId: session.user.userId,
      organizationId: session.organizationId,
      role: session.role,
      taskId: taskIdNum,
    });

    if (!access.canRead) {
      return notFound("Task not found");
    }

    const [attachment] = await db
      .select({ url: taskAttachments.url, uploadedBy: taskAttachments.uploadedBy })
      .from(taskAttachments)
      .where(
        and(
          eq(taskAttachments.id, parseInt(attachmentId, 10)),
          eq(taskAttachments.taskId, taskIdNum)
        )
      );

    if (!attachment) {
      return notFound("Attachment not found");
    }

    const isUploader = attachment.uploadedBy === session.user.userId;
    const isHighRole = HIGH_ROLES.has(session.role) && access.source === "high-role-same-org";

    if (!isUploader && !isHighRole) {
      return forbidden("Solo el autor o un administrador pueden eliminar este archivo");
    }

    await db.delete(taskAttachments)
      .where(
        and(
          eq(taskAttachments.id, parseInt(attachmentId, 10)),
          eq(taskAttachments.taskId, taskIdNum)
        )
      );

    if (attachment.url) {
      deleteR2ByUrl(attachment.url);
    }

    return ok({ message: "Attachment deleted" });
  }, "DELETE /api/tasks/[taskId]/attachments");
}
