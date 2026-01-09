import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { taskVideos, tasks } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

type RouteParams = { params: Promise<{ taskId: string }> };

// GET /api/tasks/[taskId]/videos - List task videos
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

    const videos = await db
      .select()
      .from(taskVideos)
      .where(eq(taskVideos.taskId, parseInt(taskId, 10)))
      .orderBy(asc(taskVideos.sortOrder));

    return NextResponse.json({
      success: true,
      data: videos,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch videos";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[taskId]/videos - Add video to task
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { taskId } = await params;
    const body = await request.json();

    const { youtubeUrl, title, description, sortOrder } = body;

    if (!youtubeUrl) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "youtubeUrl is required" } },
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

    const [video] = await db.insert(taskVideos).values({
      taskId: parseInt(taskId, 10),
      youtubeUrl,
      title,
      description,
      sortOrder: sortOrder || 0,
    }).returning();

    return NextResponse.json({
      success: true,
      data: video,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add video";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/tasks/[taskId]/videos - Delete video
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "videoId is required" } },
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

    await db.delete(taskVideos)
      .where(
        and(
          eq(taskVideos.id, parseInt(videoId, 10)),
          eq(taskVideos.taskId, parseInt(taskId, 10))
        )
      );

    return NextResponse.json({
      success: true,
      data: { message: "Video deleted" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete video";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
