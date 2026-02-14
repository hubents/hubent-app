import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSession, requirePermission } from "@/lib/session";
import { db } from "@/db";
import { tasks, events, taskVideos, taskAttachments, taskScheduleItems, taskHtmlContent, taskParticipants, taskMessages } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Check auth
    const authSession = await auth();
    results.auth = {
      hasSession: !!authSession,
      userId: authSession?.user?.id,
      email: authSession?.user?.email,
    };

    // 2. Check tenant session
    try {
      const session = await getSession();
      results.tenantSession = {
        success: !!session,
        organizationId: session?.organizationId,
        role: session?.role,
        userId: session?.user?.userId,
      };
    } catch (err) {
      results.tenantSession = {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }

    // 3. Check requireRole
    try {
      const session = await requirePermission("tasks:read");
      results.requireRole = {
        success: true,
        organizationId: session.organizationId,
        role: session.role,
      };
    } catch (err) {
      results.requireRole = {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }

    // 4. Get first task for testing
    const session = await getSession();
    if (session) {
      // Use simple select instead of query API to avoid schema mismatch
      const [firstTask] = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          eventId: tasks.eventId,
          organizationId: tasks.organizationId,
        })
        .from(tasks)
        .where(eq(tasks.organizationId, session.organizationId))
        .limit(1);

      results.firstTask = firstTask ? {
        id: firstTask.id,
        title: firstTask.title,
        eventId: firstTask.eventId,
        organizationId: firstTask.organizationId,
      } : null;

      if (firstTask) {
        // Test each sub-query
        const taskId = firstTask.id;

        // Videos
        try {
          const videos = await db.select().from(taskVideos).where(eq(taskVideos.taskId, taskId));
          results.videos = { success: true, count: videos.length };
        } catch (err) {
          results.videos = { success: false, error: err instanceof Error ? err.message : "Unknown" };
        }

        // Attachments
        try {
          const attachments = await db.select().from(taskAttachments).where(eq(taskAttachments.taskId, taskId));
          results.attachments = { success: true, count: attachments.length };
        } catch (err) {
          results.attachments = { success: false, error: err instanceof Error ? err.message : "Unknown" };
        }

        // Schedule
        try {
          const schedule = await db.select().from(taskScheduleItems).where(eq(taskScheduleItems.taskId, taskId));
          results.schedule = { success: true, count: schedule.length };
        } catch (err) {
          results.schedule = { success: false, error: err instanceof Error ? err.message : "Unknown" };
        }

        // HTML Content
        try {
          const [html] = await db.select().from(taskHtmlContent).where(eq(taskHtmlContent.taskId, taskId)).limit(1);
          results.htmlContent = { success: true, hasContent: !!html };
        } catch (err) {
          results.htmlContent = { success: false, error: err instanceof Error ? err.message : "Unknown" };
        }

        // Participants
        try {
          const participants = await db.select().from(taskParticipants).where(eq(taskParticipants.taskId, taskId));
          results.participants = { success: true, count: participants.length };
        } catch (err) {
          results.participants = { success: false, error: err instanceof Error ? err.message : "Unknown" };
        }

        // Messages
        try {
          const messages = await db.select().from(taskMessages).where(eq(taskMessages.taskId, taskId));
          results.messages = { success: true, count: messages.length };
        } catch (err) {
          results.messages = { success: false, error: err instanceof Error ? err.message : "Unknown" };
        }
      }

      // 5. Get first event
      const [firstEvent] = await db
        .select({
          id: events.id,
          name: events.name,
          status: events.status,
          organizationId: events.organizationId,
        })
        .from(events)
        .where(eq(events.organizationId, session.organizationId))
        .limit(1);

      results.firstEvent = firstEvent ? {
        id: firstEvent.id,
        name: firstEvent.name,
        status: firstEvent.status,
        organizationId: firstEvent.organizationId,
      } : null;
    }

    // 6. Check database tables exist
    try {
      const tableChecks = await Promise.all([
        db.select().from(tasks).limit(1).then(() => true).catch(() => false),
        db.select().from(events).limit(1).then(() => true).catch(() => false),
        db.select().from(taskVideos).limit(1).then(() => true).catch(() => false),
        db.select().from(taskAttachments).limit(1).then(() => true).catch(() => false),
        db.select().from(taskScheduleItems).limit(1).then(() => true).catch(() => false),
        db.select().from(taskHtmlContent).limit(1).then(() => true).catch(() => false),
        db.select().from(taskParticipants).limit(1).then(() => true).catch(() => false),
        db.select().from(taskMessages).limit(1).then(() => true).catch(() => false),
      ]);

      results.tables = {
        tasks: tableChecks[0],
        events: tableChecks[1],
        taskVideos: tableChecks[2],
        taskAttachments: tableChecks[3],
        taskScheduleItems: tableChecks[4],
        taskHtmlContent: tableChecks[5],
        taskParticipants: tableChecks[6],
        taskMessages: tableChecks[7],
      };
    } catch (err) {
      results.tables = { error: err instanceof Error ? err.message : "Unknown" };
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      ...results,
      fatalError: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
