import { NextRequest } from "next/server";
import { requirePermission, requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { taskVideos } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { apiHandler, ok, badRequest, notFound, created } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ taskId: string }> };

// GET /api/tasks/[taskId]/videos - List task videos
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:read");
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
      return notFound("Task not found");
    }

    const videos = await db
      .select()
      .from(taskVideos)
      .where(eq(taskVideos.taskId, parseInt(taskId, 10)))
      .orderBy(asc(taskVideos.sortOrder));

    return ok(videos);
  }, "GET /api/tasks/[taskId]/videos");
}

// POST /api/tasks/[taskId]/videos - Add video to task
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    const body = await request.json();

    const { youtubeUrl, title, description, sortOrder } = body;

    if (!youtubeUrl) {
      return badRequest("youtubeUrl is required");
    }

    const task = await db.query.tasks.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.id, parseInt(taskId, 10)),
          eq(t.organizationId, session.organizationId)
        ),
    });

    if (!task) {
      return notFound("Task not found");
    }

    if (session.eventScoped && task.eventId) {
      await requireEventSectionAccess(task.eventId, "tasks", "edit");
    }

    const [video] = await db.insert(taskVideos).values({
      taskId: parseInt(taskId, 10),
      youtubeUrl,
      title,
      description,
      sortOrder: sortOrder || 0,
    }).returning();

    return created(video);
  }, "POST /api/tasks/[taskId]/videos");
}

// DELETE /api/tasks/[taskId]/videos - Delete video
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return badRequest("videoId is required");
    }

    const task = await db.query.tasks.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.id, parseInt(taskId, 10)),
          eq(t.organizationId, session.organizationId)
        ),
    });

    if (!task) {
      return notFound("Task not found");
    }

    if (session.eventScoped && task.eventId) {
      await requireEventSectionAccess(task.eventId, "tasks", "edit");
    }

    await db.delete(taskVideos)
      .where(
        and(
          eq(taskVideos.id, parseInt(videoId, 10)),
          eq(taskVideos.taskId, parseInt(taskId, 10))
        )
      );

    return ok({ message: "Video deleted" });
  }, "DELETE /api/tasks/[taskId]/videos");
}
