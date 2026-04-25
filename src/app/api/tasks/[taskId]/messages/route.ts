import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { 
  getTaskMessages, 
  sendTaskMessage, 
  editTaskMessage,
  deleteTaskMessage,
  canAccessTaskChat,
  canCommentOnTask,
  getTaskParticipantUserIds
} from "@/lib/task-chat";
import { triggerTaskMessage, EVENTS } from "@/lib/pusher";
import { sendPushToUsers } from "@/lib/beams";
import { notifyMentions } from "@/lib/push-notifications";
import { db } from "@/db";
import { tasks, organizationMembers, users, taskAttachments } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ taskId: string }> };

// GET /api/tasks/[taskId]/messages - Get task messages
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Check access
    const canAccess = await canAccessTaskChat(session, parseInt(taskId, 10));
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You don't have access to this task" } },
        { status: 403 }
      );
    }

    const taskIdNum = parseInt(taskId, 10);

    const [messages, canComment] = await Promise.all([
      getTaskMessages(session, taskIdNum, {
        limit,
        offset,
        includePrivate: true,
      }),
      canCommentOnTask(session, taskIdNum),
    ]);

    return NextResponse.json({
      success: true,
      data: messages,
      canComment,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch messages";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[taskId]/messages - Send a message
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { taskId } = await params;
    const body = await request.json();

    const { content, type, isPrivate, visibleTo, attachmentId } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Message content is required" } },
        { status: 400 }
      );
    }

    const taskIdNum = parseInt(taskId, 10);
    const message = await sendTaskMessage(session, taskIdNum, {
      content,
      type,
      isPrivate,
      visibleTo,
    });

    // If an attachment was uploaded BEFORE the message, link it now so subscribers
    // receive a complete message-with-attachment payload via Pusher (no race).
    let linkedAttachment: typeof taskAttachments.$inferSelect | null = null;
    if (attachmentId && Number.isFinite(Number(attachmentId))) {
      const [updated] = await db.update(taskAttachments)
        .set({ messageId: message.id })
        .where(
          and(
            eq(taskAttachments.id, Number(attachmentId)),
            eq(taskAttachments.taskId, taskIdNum),
          ),
        )
        .returning();
      linkedAttachment = updated ?? null;
    }

    try {
      await triggerTaskMessage(taskIdNum, EVENTS.MESSAGE_NEW, {
        id: message.id,
        taskId: message.taskId,
        senderId: message.senderId,
        senderName: message.senderName || undefined,
        senderImage: message.senderImage || undefined,
        content: message.content,
        type: message.type || "text",
        isPrivate: message.isPrivate ?? false,
        createdAt: message.createdAt?.toISOString() || new Date().toISOString(),
      });
    } catch (pusherError) {
      console.error("Pusher trigger failed:", pusherError);
    }

    // Send push notifications to other participants (async, don't wait)
    getTaskParticipantUserIds(parseInt(taskId, 10)).then(async (userIds) => {
      // Exclude the sender from push notifications
      const recipients = userIds.filter(id => id !== session.user.userId);
      if (recipients.length === 0) return;

      const senderName = message.senderName || session.user.name || "Alguien";
      const preview = message.content.length > 100 
        ? message.content.substring(0, 100) + "..." 
        : message.content;

      await sendPushToUsers(recipients, {
        title: `💬 ${senderName}`,
        body: preview,
        deep_link: `https://app.hubents.com/dashboard/tareas?task=${taskId}`,
        data: {
          type: "new_message",
          taskId: taskId.toString(),
          messageId: message.id.toString(),
        },
      });
    }).catch(err => console.error("Push notification failed:", err));

    // Check for mentions and notify mentioned users
    if (message.content.includes("@")) {
      const taskInfo = await db.query.tasks.findFirst({
        where: (t, { eq }) => eq(t.id, taskIdNum),
        columns: { title: true, organizationId: true },
      });

      if (taskInfo) {
        // Get team members
        const members = await db
          .select({ 
            id: users.id, 
            name: users.name, 
            email: users.email 
          })
          .from(organizationMembers)
          .innerJoin(users, eq(users.id, organizationMembers.userId))
          .where(eq(organizationMembers.organizationId, taskInfo.organizationId));

        const teamMembers = members.map(m => ({
          id: m.id,
          name: m.name || "",
          email: m.email || "",
        }));

        notifyMentions(
          taskIdNum,
          taskInfo.title,
          message.content,
          message.senderName || session.user.name || "Alguien",
          session.user.userId,
          teamMembers
        ).catch(err => console.error("Mention notification failed:", err));
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...message,
        attachments: linkedAttachment ? [linkedAttachment] : [],
      },
    });
  } catch (error) {
    console.error("POST /api/tasks/[taskId]/messages error:", error);
    const message = error instanceof Error ? error.message : "Failed to send message";
    // Use 403 for permission errors, 400 for validation, 500 for others
    let status = 500;
    if (message.includes("access") || message.includes("permission")) {
      status = 403;
    } else if (message.includes("required") || message.includes("invalid")) {
      status = 400;
    }
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status }
    );
  }
}

// PATCH /api/tasks/[taskId]/messages - Edit a message
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { messageId, content } = body;

    if (!messageId || !content) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "messageId and content are required" } },
        { status: 400 }
      );
    }

    const updated = await editTaskMessage(session, messageId, content);

    // Trigger real-time event via Pusher
    try {
      if (updated) {
        await triggerTaskMessage(updated.taskId, EVENTS.MESSAGE_EDITED, {
          id: updated.id,
          taskId: updated.taskId,
          senderId: updated.senderId,
          senderName: undefined,
          senderImage: undefined,
          content: updated.content,
          type: updated.type || "text",
          isPrivate: updated.isPrivate ?? false,
          createdAt: updated.createdAt?.toISOString() || new Date().toISOString(),
        });
      }
    } catch (pusherError) {
      console.error("Pusher trigger failed:", pusherError);
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to edit message";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/tasks/[taskId]/messages - Delete a message
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");

    if (!messageId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "messageId is required" } },
        { status: 400 }
      );
    }

    const taskIdNum = parseInt((await params).taskId, 10);
    await deleteTaskMessage(session, parseInt(messageId, 10));

    // Trigger real-time event via Pusher
    try {
      await triggerTaskMessage(taskIdNum, EVENTS.MESSAGE_DELETED, {
        id: parseInt(messageId, 10),
      } as never);
    } catch (pusherError) {
      console.error("Pusher trigger failed:", pusherError);
    }

    return NextResponse.json({
      success: true,
      data: { message: "Message deleted" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete message";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
