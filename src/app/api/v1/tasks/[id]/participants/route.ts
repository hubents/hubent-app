import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { taskParticipants, tasks, users, vendors, contacts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { validationError, notFoundError } from "@/lib/api/api-errors";

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const taskId = parseInt(params.id, 10);
    if (isNaN(taskId)) throw validationError("Invalid task ID.", "id");

    const [task] = await db.select({ id: tasks.id }).from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, session.organizationId))).limit(1);
    if (!task) throw notFoundError("Task", params.id);

    const participants = await db
      .select({
        id: taskParticipants.id,
        taskId: taskParticipants.taskId,
        userId: taskParticipants.userId,
        vendorId: taskParticipants.vendorId,
        contactId: taskParticipants.contactId,
        type: taskParticipants.type,
        canEdit: taskParticipants.canEdit,
        canComment: taskParticipants.canComment,
        addedAt: taskParticipants.addedAt,
        userName: users.name,
        vendorName: vendors.name,
        contactName: contacts.name,
      })
      .from(taskParticipants)
      .leftJoin(users, eq(taskParticipants.userId, users.id))
      .leftJoin(vendors, eq(taskParticipants.vendorId, vendors.id))
      .leftJoin(contacts, eq(taskParticipants.contactId, contacts.id))
      .where(eq(taskParticipants.taskId, taskId));

    return { data: { object: "list", data: participants.map((p) => ({ object: "participant", ...p })), url: `/api/v1/tasks/${taskId}/participants` } };
  },
  { scope: "tasks:read" }
);
