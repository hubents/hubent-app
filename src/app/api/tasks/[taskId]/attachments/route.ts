import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { taskAttachments } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { deleteR2ByUrl } from "@/lib/r2";
import { canAccessTaskFor } from "@/lib/task-access";

type RouteParams = { params: Promise<{ taskId: string }> };

const HIGH_ROLES = new Set(["manager", "admin", "owner", "super_admin"]);

// GET /api/tasks/[taskId]/attachments - List task attachments (cross-org aware)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
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
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
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

    return NextResponse.json({
      success: true,
      data: attachments,
    });
  } catch (error) {
    console.error("GET /api/tasks/[taskId]/attachments error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch attachments";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}

// POST /api/tasks/[taskId]/attachments - Add attachment to task (requires comment access)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { taskId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    const body = await request.json();

    const { name, url, type, thumbnail, size, mimeType, messageId } = body;

    if (!name || !url) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "name and url are required" } },
        { status: 400 }
      );
    }

    const access = await canAccessTaskFor({
      userId: session.user.userId,
      organizationId: session.organizationId,
      role: session.role,
      taskId: taskIdNum,
    });

    if (!access.canComment) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "No tienes permiso para subir archivos a esta tarea" } },
        { status: 403 }
      );
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

    return NextResponse.json({
      success: true,
      data: attachment,
    });
  } catch (error) {
    console.error("POST /api/tasks/[taskId]/attachments error:", error);
    const message = error instanceof Error ? error.message : "Failed to add attachment";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status }
    );
  }
}

// DELETE /api/tasks/[taskId]/attachments - Delete attachment (uploader or high-role within scope)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { taskId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get("attachmentId");

    if (!attachmentId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "attachmentId is required" } },
        { status: 400 }
      );
    }

    const access = await canAccessTaskFor({
      userId: session.user.userId,
      organizationId: session.organizationId,
      role: session.role,
      taskId: taskIdNum,
    });

    if (!access.canRead) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
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
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Attachment not found" } },
        { status: 404 }
      );
    }

    const isUploader = attachment.uploadedBy === session.user.userId;
    const isHighRole = HIGH_ROLES.has(session.role) && access.source === "high-role-same-org";

    if (!isUploader && !isHighRole) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Solo el autor o un administrador pueden eliminar este archivo" } },
        { status: 403 }
      );
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

    return NextResponse.json({
      success: true,
      data: { message: "Attachment deleted" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete attachment";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status }
    );
  }
}
