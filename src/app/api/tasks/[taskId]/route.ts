import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ taskId: string }> };

// GET /api/tasks/[taskId] - Get single task
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("viewer");
    const { taskId } = await params;

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

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("GET /api/tasks/[taskId] error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch task";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}

// PATCH /api/tasks/[taskId] - Update task
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { taskId } = await params;
    const body = await request.json();

    // Remove undefined values and handle date conversion
    const cleanBody: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        if (key === "dueDate" && value) {
          cleanBody[key] = new Date(value as string);
        } else {
          cleanBody[key] = value;
        }
      }
    }

    const [updated] = await db.update(tasks)
      .set({ ...cleanBody, updatedAt: new Date() })
      .where(
        and(
          eq(tasks.id, parseInt(taskId, 10)),
          eq(tasks.organizationId, session.organizationId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("PATCH /api/tasks/[taskId] error:", error);
    const message = error instanceof Error ? error.message : "Failed to update task";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status }
    );
  }
}

// DELETE /api/tasks/[taskId] - Delete task
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { taskId } = await params;

    await db.delete(tasks)
      .where(
        and(
          eq(tasks.id, parseInt(taskId, 10)),
          eq(tasks.organizationId, session.organizationId)
        )
      );

    return NextResponse.json({
      success: true,
      data: { message: "Task deleted" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete task";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
