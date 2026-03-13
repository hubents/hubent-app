import { db } from "@/db";
import { 
  taskMessages, 
  taskAttachments,
  taskParticipants,
  tasks,
  users
} from "@/db/schema";
import { eq, and, desc, isNull, or, sql } from "drizzle-orm";
import type { TenantSession } from "@/types";

// ============================================
// TASK CHAT HELPERS
// ============================================

/**
 * Check if user can access task chat
 */
export async function canAccessTaskChat(
  session: TenantSession,
  taskId: number
): Promise<boolean> {
  // High-privilege roles can access all tasks in their org
  const highRoles = ["planner", "admin", "owner", "super_admin", "provider_owner", "provider_admin"];
  
  if (highRoles.includes(session.role)) {
    // Verify task belongs to organization
    const task = await db.query.tasks.findFirst({
      where: (t, { eq, and }) => 
        and(
          eq(t.id, taskId),
          eq(t.organizationId, session.organizationId)
        ),
    });
    return !!task;
  }

  // For others, must be a direct task participant
  const [participant] = await db
    .select()
    .from(taskParticipants)
    .where(
      and(
        eq(taskParticipants.taskId, taskId),
        eq(taskParticipants.userId, session.user.userId)
      )
    )
    .limit(1);

  return !!participant;
}

/**
 * Get messages for a task
 */
export async function getTaskMessages(
  session: TenantSession,
  taskId: number,
  options: {
    limit?: number;
    offset?: number;
    includePrivate?: boolean;
  } = {}
) {
  const { limit = 50, offset = 0, includePrivate = true } = options;

  // Build where clause
  let whereClause = and(
    eq(taskMessages.taskId, taskId),
    isNull(taskMessages.deletedAt)
  );

  // If not including private or user is not planner+, filter private messages
  if (!includePrivate) {
    whereClause = and(
      whereClause,
      or(
        eq(taskMessages.isPrivate, false),
        eq(taskMessages.senderId, session.user.userId),
        sql`${session.user.userId} = ANY(${taskMessages.visibleTo})`
      )
    );
  }

  const messages = await db
    .select({
      id: taskMessages.id,
      taskId: taskMessages.taskId,
      senderId: taskMessages.senderId,
      type: taskMessages.type,
      content: taskMessages.content,
      isPrivate: taskMessages.isPrivate,
      visibleTo: taskMessages.visibleTo,
      isEdited: taskMessages.isEdited,
      editedAt: taskMessages.editedAt,
      createdAt: taskMessages.createdAt,
      senderName: users.name,
      senderEmail: users.email,
      senderImage: users.image,
      emailFrom: taskMessages.emailFrom,
      emailTo: taskMessages.emailTo,
      emailCc: taskMessages.emailCc,
      emailBcc: taskMessages.emailBcc,
      emailSubject: taskMessages.emailSubject,
      emailThreadId: taskMessages.emailThreadId,
      emailMessageId: taskMessages.emailMessageId,
      whatsappTo: taskMessages.whatsappTo,
      whatsappFrom: taskMessages.whatsappFrom,
      whatsappTemplate: taskMessages.whatsappTemplate,
      whatsappMessageId: taskMessages.whatsappMessageId,
    })
    .from(taskMessages)
    .innerJoin(users, eq(taskMessages.senderId, users.id))
    .where(whereClause)
    .orderBy(desc(taskMessages.createdAt))
    .limit(limit)
    .offset(offset);

  // Get attachments for messages
  const messageIds = messages.map(m => m.id);
  
  let attachments: Array<{
    id: number;
    messageId: number | null;
    type: string | null;
    name: string;
    url: string;
    thumbnail: string | null;
    size: number | null;
    mimeType: string | null;
  }> = [];

  if (messageIds.length > 0) {
    attachments = await db
      .select({
        id: taskAttachments.id,
        messageId: taskAttachments.messageId,
        type: taskAttachments.type,
        name: taskAttachments.name,
        url: taskAttachments.url,
        thumbnail: taskAttachments.thumbnail,
        size: taskAttachments.size,
        mimeType: taskAttachments.mimeType,
      })
      .from(taskAttachments)
      .where(sql`${taskAttachments.messageId} IN (${sql.join(messageIds.map(id => sql`${id}`), sql`, `)})`);
  }

  // Combine messages with attachments
  const messagesWithAttachments = messages.map(message => ({
    ...message,
    attachments: attachments.filter(a => a.messageId === message.id),
  }));

  // Reverse to get chronological order
  return messagesWithAttachments.reverse();
}

/**
 * Check if user can comment on a task (for UI conditional rendering)
 * Returns: true if user can comment, false otherwise
 */
export async function canCommentOnTask(
  session: TenantSession,
  taskId: number
): Promise<boolean> {
  const highRoles = ["planner", "admin", "owner", "super_admin", "provider_owner", "provider_admin"];
  if (highRoles.includes(session.role)) {
    return true;
  }

  const [participant] = await db
    .select({ canComment: taskParticipants.canComment })
    .from(taskParticipants)
    .where(
      and(
        eq(taskParticipants.taskId, taskId),
        eq(taskParticipants.userId, session.user.userId)
      )
    )
    .limit(1);

  if (!participant) return false;
  return participant.canComment !== false;
}

/**
 * Send a message to task chat
 */
export async function sendTaskMessage(
  session: TenantSession,
  taskId: number,
  params: {
    content: string;
    type?: "text" | "file" | "image" | "link" | "system";
    isPrivate?: boolean;
    visibleTo?: string[];
  }
) {
  // Verify access
  const canAccess = await canAccessTaskChat(session, taskId);
  if (!canAccess) {
    throw new Error("You don't have access to this task");
  }

  // Check if user can comment
  const [participant] = await db
    .select()
    .from(taskParticipants)
    .where(
      and(
        eq(taskParticipants.taskId, taskId),
        eq(taskParticipants.userId, session.user.userId)
      )
    )
    .limit(1);

  // If participant exists but can't comment, deny
  if (participant && !participant.canComment) {
    throw new Error("You don't have permission to comment on this task");
  }

  const [message] = await db.insert(taskMessages).values({
    taskId,
    senderId: session.user.userId,
    type: params.type || "text",
    content: params.content,
    isPrivate: params.isPrivate || false,
    visibleTo: params.visibleTo,
  }).returning();

  // Get sender info
  const sender = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, session.user.userId),
  });

  return {
    ...message,
    senderName: sender?.name,
    senderEmail: sender?.email,
    senderImage: sender?.image,
    attachments: [],
  };
}

/**
 * Edit a message
 */
export async function editTaskMessage(
  session: TenantSession,
  messageId: number,
  content: string
) {
  // Get the message
  const message = await db.query.taskMessages.findFirst({
    where: (m, { eq }) => eq(m.id, messageId),
  });

  if (!message) {
    throw new Error("Message not found");
  }

  // Only sender can edit
  if (message.senderId !== session.user.userId) {
    throw new Error("You can only edit your own messages");
  }

  const [updated] = await db.update(taskMessages)
    .set({
      content,
      isEdited: true,
      editedAt: new Date(),
    })
    .where(eq(taskMessages.id, messageId))
    .returning();

  return updated;
}

/**
 * Delete a message (soft delete)
 */
export async function deleteTaskMessage(
  session: TenantSession,
  messageId: number
) {
  // Get the message
  const message = await db.query.taskMessages.findFirst({
    where: (m, { eq }) => eq(m.id, messageId),
  });

  if (!message) {
    throw new Error("Message not found");
  }

  // Only sender or high-privilege roles can delete
  const highRoles = ["planner", "admin", "owner", "super_admin", "provider_owner", "provider_admin"];
  const isHighRole = highRoles.includes(session.role);

  if (message.senderId !== session.user.userId && !isHighRole) {
    throw new Error("You don't have permission to delete this message");
  }

  await db.update(taskMessages)
    .set({ deletedAt: new Date() })
    .where(eq(taskMessages.id, messageId));
}

/**
 * Add attachment to task (optionally linked to a message)
 */
export async function addTaskAttachment(
  session: TenantSession,
  taskId: number,
  params: {
    messageId?: number;
    type: "file" | "document" | "image" | "link";
    name: string;
    url: string;
    thumbnail?: string;
    size?: number;
    mimeType?: string;
  }
) {
  // Verify access
  const canAccess = await canAccessTaskChat(session, taskId);
  if (!canAccess) {
    throw new Error("You don't have access to this task");
  }

  const [attachment] = await db.insert(taskAttachments).values({
    taskId,
    messageId: params.messageId,
    type: params.type,
    name: params.name,
    url: params.url,
    thumbnail: params.thumbnail,
    size: params.size,
    mimeType: params.mimeType,
    uploadedBy: session.user.userId,
  }).returning();

  return attachment;
}

/**
 * Get all attachments for a task (grouped by type)
 */
export async function getTaskAttachments(taskId: number) {
  const attachments = await db
    .select()
    .from(taskAttachments)
    .where(eq(taskAttachments.taskId, taskId))
    .orderBy(desc(taskAttachments.uploadedAt));

  return {
    files: attachments.filter(a => a.type === "file"),
    documents: attachments.filter(a => a.type === "document"),
    images: attachments.filter(a => a.type === "image"),
    links: attachments.filter(a => a.type === "link"),
  };
}

/**
 * Delete an attachment
 */
export async function deleteTaskAttachment(
  session: TenantSession,
  attachmentId: number
) {
  const attachment = await db.query.taskAttachments.findFirst({
    where: (a, { eq }) => eq(a.id, attachmentId),
  });

  if (!attachment) {
    throw new Error("Attachment not found");
  }

  // Only uploader or high-privilege roles can delete
  const highRoles = ["planner", "admin", "owner", "super_admin", "provider_owner", "provider_admin"];
  const isHighRole = highRoles.includes(session.role);

  if (attachment.uploadedBy !== session.user.userId && !isHighRole) {
    throw new Error("You don't have permission to delete this attachment");
  }

  await db.delete(taskAttachments)
    .where(eq(taskAttachments.id, attachmentId));
}

/**
 * Get all user IDs that should receive notifications for a task
 * Includes: assignee + all participants with userId
 */
export async function getTaskParticipantUserIds(taskId: number): Promise<string[]> {
  const task = await db.query.tasks.findFirst({
    where: (t, { eq }) => eq(t.id, taskId),
    columns: { assignedTo: true },
  });

  const participants = await db
    .select({ userId: taskParticipants.userId })
    .from(taskParticipants)
    .where(eq(taskParticipants.taskId, taskId));

  const userIds = new Set<string>();
  
  // Add assignee
  if (task?.assignedTo) {
    userIds.add(task.assignedTo);
  }
  
  // Add participants with userId
  for (const p of participants) {
    if (p.userId) {
      userIds.add(p.userId);
    }
  }

  return Array.from(userIds);
}
