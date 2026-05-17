import { NextRequest } from "next/server";
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
import { organizationMembers, users, taskAttachments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, ok, badRequest, forbidden } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ taskId: string }> };

// GET /api/tasks/[taskId]/messages - Get task messages
export async function GET(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { taskId } = await params;
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Check access
    const canAccess = await canAccessTaskChat(session, parseInt(taskId, 10));
    if (!canAccess) {
      return forbidden("You don't have access to this task");
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

    return ok(messages, 200, { canComment });
  }, "GET /api/tasks/[taskId]/messages");
}

// POST /api/tasks/[taskId]/messages - Send a message
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { taskId } = await params;
    const body = await request.json();

    const { content, type, isPrivate, visibleTo, attachmentId } = body;

    if (!content || content.trim() === "") {
      return badRequest("Message content is required");
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

    return ok({
      ...message,
      attachments: linkedAttachment ? [linkedAttachment] : [],
    });
  }, "POST /api/tasks/[taskId]/messages");
}

// PATCH /api/tasks/[taskId]/messages - Edit a message
export async function PATCH(request: NextRequest, { params: _params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const body = await request.json();

    const { messageId, content } = body;

    if (!messageId || !content) {
      return badRequest("messageId and content are required");
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

    return ok(updated);
  }, "PATCH /api/tasks/[taskId]/messages");
}

// DELETE /api/tasks/[taskId]/messages - Delete a message
export async function DELETE(request: NextRequest, { params: _params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");

    if (!messageId) {
      return badRequest("messageId is required");
    }

    const taskIdNum = parseInt((await _params).taskId, 10);
    await deleteTaskMessage(session, parseInt(messageId, 10));

    // Trigger real-time event via Pusher
    try {
      await triggerTaskMessage(taskIdNum, EVENTS.MESSAGE_DELETED, {
        id: parseInt(messageId, 10),
      } as never);
    } catch (pusherError) {
      console.error("Pusher trigger failed:", pusherError);
    }

    return ok({ message: "Message deleted" });
  }, "DELETE /api/tasks/[taskId]/messages");
}
