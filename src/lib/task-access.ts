import { db } from "@/db";
import {
  taskParticipants,
  vendors,
  eventCollaborations,
  organizationMembers,
  roles as rolesTable,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Centralized cross-org task access resolver.
 *
 * Combines the four authorization paths that were previously duplicated across
 * `task-chat.ts`, `pusher/auth/route.ts`, and `tasks/[taskId]/route.ts`:
 *
 *   1. High-privilege same-org bypass (manager/admin/owner/super_admin
 *      whose org owns the task)
 *   2. Direct user participant (`task_participants.userId === userId`)
 *   3. Vendor → providerOrg fallback (vendor on the task whose
 *      `vendors.providerOrgId === organizationId`)
 *   4. Event collaboration (org is an active guest on the task's event AND
 *      either the task is `sharedWithHost` OR an entry in
 *      `task_participants.collaboratorOrgId === organizationId` exists)
 *
 * Returns whether the user can read the task chat/messages, comment, edit,
 * and a `source` describing which path matched. Use `canEdit` ONLY at the
 * read/comment level — task UPDATE/DELETE operations should still go through
 * `canEditTask` in `tenant.ts` which honors `event_participants.permissions`.
 */
export type TaskAccessSource =
  | "high-role-same-org"
  | "participant-user"
  | "participant-vendor"
  | "collaboration"
  | null;

export interface TaskAccessResult {
  allowed: boolean;
  canRead: boolean;
  canComment: boolean;
  canEdit: boolean;
  source: TaskAccessSource;
}

const HIGH_ROLES = new Set(["manager", "admin", "owner", "super_admin"]);

const NONE: TaskAccessResult = {
  allowed: false,
  canRead: false,
  canComment: false,
  canEdit: false,
  source: null,
};

interface TaskAccessParams {
  userId: string;
  organizationId: number;
  role?: string;
  taskId: number;
}

export async function canAccessTaskFor(params: TaskAccessParams): Promise<TaskAccessResult> {
  const { userId, organizationId, role, taskId } = params;

  let resolvedRole = role;
  if (!resolvedRole) {
    const [member] = await db
      .select({ slug: rolesTable.slug })
      .from(organizationMembers)
      .innerJoin(rolesTable, eq(organizationMembers.roleId, rolesTable.id))
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, organizationId),
        ),
      )
      .limit(1);
    resolvedRole = member?.slug ?? "viewer";
  }

  const task = await db.query.tasks.findFirst({
    where: (t, { eq }) => eq(t.id, taskId),
    columns: {
      id: true,
      eventId: true,
      organizationId: true,
      sharedWithHost: true,
    },
  });

  if (!task) return NONE;

  // 1. High-privilege same-org bypass
  if (HIGH_ROLES.has(resolvedRole) && task.organizationId === organizationId) {
    return {
      allowed: true,
      canRead: true,
      canComment: true,
      canEdit: true,
      source: "high-role-same-org",
    };
  }

  // 2. Direct user participant
  const [userParticipant] = await db
    .select({
      canEdit: taskParticipants.canEdit,
      canComment: taskParticipants.canComment,
    })
    .from(taskParticipants)
    .where(
      and(
        eq(taskParticipants.taskId, taskId),
        eq(taskParticipants.userId, userId),
      ),
    )
    .limit(1);

  if (userParticipant) {
    return {
      allowed: true,
      canRead: true,
      canComment: userParticipant.canComment !== false,
      canEdit: userParticipant.canEdit === true,
      source: "participant-user",
    };
  }

  // 3. Vendor → providerOrg fallback
  const [vendorParticipant] = await db
    .select({
      canEdit: taskParticipants.canEdit,
      canComment: taskParticipants.canComment,
    })
    .from(taskParticipants)
    .innerJoin(vendors, eq(vendors.id, taskParticipants.vendorId))
    .where(
      and(
        eq(taskParticipants.taskId, taskId),
        eq(vendors.providerOrgId, organizationId),
      ),
    )
    .limit(1);

  if (vendorParticipant) {
    return {
      allowed: true,
      canRead: true,
      canComment: vendorParticipant.canComment !== false,
      canEdit: vendorParticipant.canEdit === true,
      source: "participant-vendor",
    };
  }

  // 4. Event collaboration (cross-org guest)
  if (task.eventId && task.organizationId !== organizationId) {
    const [collab] = await db
      .select({ permissions: eventCollaborations.permissions })
      .from(eventCollaborations)
      .where(
        and(
          eq(eventCollaborations.eventId, task.eventId),
          eq(eventCollaborations.guestOrgId, organizationId),
          eq(eventCollaborations.status, "active"),
        ),
      )
      .limit(1);

    if (collab) {
      const [orgParticipant] = await db
        .select({
          canEdit: taskParticipants.canEdit,
          canComment: taskParticipants.canComment,
        })
        .from(taskParticipants)
        .where(
          and(
            eq(taskParticipants.taskId, taskId),
            eq(taskParticipants.collaboratorOrgId, organizationId),
          ),
        )
        .limit(1);

      const isShared = task.sharedWithHost === true;

      if (isShared || orgParticipant) {
        const collabTasksLevel = (collab.permissions as Record<string, string> | null)?.tasks;
        const collabCanEdit = collabTasksLevel === "edit";

        return {
          allowed: true,
          canRead: true,
          canComment: orgParticipant?.canComment !== false,
          canEdit: collabCanEdit && (orgParticipant?.canEdit !== false),
          source: "collaboration",
        };
      }
    }
  }

  return NONE;
}
