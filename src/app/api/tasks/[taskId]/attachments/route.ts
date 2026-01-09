import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { taskAttachments, tasks } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

type RouteParams = { params: Promise<{ taskId: string }> };

// GET /api/tasks/[taskId]/attachments - List task attachments
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("viewer");
    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    // Verify task belongs to organization
    const task = await db.query.tasks.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.id, parseInt(taskId, 10)),
          eq(t.organizationId, session.organizationId)
        ),
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    let whereClause = eq(taskAttachments.taskId, parseInt(taskId, 10));
    
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
    const message = error instanceof Error ? error.message : "Failed to fetch attachments";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[taskId]/attachments - Add attachment to task
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { taskId } = await params;
    const body = await request.json();

    const { name, url, type, thumbnail, size, mimeType, messageId } = body;

    if (!name || !url) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "name and url are required" } },
        { status: 400 }
      );
    }

    // Verify task belongs to organization
    const task = await db.query.tasks.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.id, parseInt(taskId, 10)),
          eq(t.organizationId, session.organizationId)
        ),
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    const [attachment] = await db.insert(taskAttachments).values({
      taskId: parseInt(taskId, 10),
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
    const message = error instanceof Error ? error.message : "Failed to add attachment";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/tasks/[taskId]/attachments - Delete attachment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get("attachmentId");

    if (!attachmentId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "attachmentId is required" } },
        { status: 400 }
      );
    }

    // Verify task belongs to organization
    const task = await db.query.tasks.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.id, parseInt(taskId, 10)),
          eq(t.organizationId, session.organizationId)
        ),
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    await db.delete(taskAttachments)
      .where(
        and(
          eq(taskAttachments.id, parseInt(attachmentId, 10)),
          eq(taskAttachments.taskId, parseInt(taskId, 10))
        )
      );

    return NextResponse.json({
      success: true,
      data: { message: "Attachment deleted" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete attachment";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
