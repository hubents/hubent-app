import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { taskHtmlContent, tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ taskId: string }> };

// GET /api/tasks/[taskId]/html-content - Get task HTML content
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("viewer");
    const { taskId } = await params;

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

    const htmlContent = await db.query.taskHtmlContent.findFirst({
      where: (h, { eq }) => eq(h.taskId, parseInt(taskId, 10)),
    });

    return NextResponse.json({
      success: true,
      data: htmlContent || { taskId: parseInt(taskId, 10), content: "" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch HTML content";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[taskId]/html-content - Create or update task HTML content
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { taskId } = await params;
    const body = await request.json();

    const { content } = body;

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

    // Check if content already exists
    const existing = await db.query.taskHtmlContent.findFirst({
      where: (h, { eq }) => eq(h.taskId, parseInt(taskId, 10)),
    });

    let result;
    if (existing) {
      // Update existing
      [result] = await db.update(taskHtmlContent)
        .set({
          content,
          updatedBy: session.user.userId,
          updatedAt: new Date(),
        })
        .where(eq(taskHtmlContent.taskId, parseInt(taskId, 10)))
        .returning();
    } else {
      // Create new
      [result] = await db.insert(taskHtmlContent).values({
        taskId: parseInt(taskId, 10),
        content,
        updatedBy: session.user.userId,
      }).returning();
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save HTML content";
    return NextResponse.json(
      { success: false, error: { code: "SAVE_ERROR", message } },
      { status: 400 }
    );
  }
}
