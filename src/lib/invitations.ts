import { db } from "@/db";
import { 
  invitations, 
  roles, 
  users, 
  organizationMembers,
  eventParticipants,
  taskParticipants,
  events,
  tasks,
  vendors,
  contacts,
  organizations
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { TenantSession } from "@/types";
import { canInviteRole } from "@/lib/tenant";
import { sendContactTaskNotificationEmail } from "@/lib/email";

// ============================================
// INVITATION HELPERS
// ============================================

/**
 * Generate a secure random token
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create an invitation to join an organization
 */
export async function createOrganizationInvitation(
  session: TenantSession,
  email: string,
  roleSlug: string,
  expiresInDays: number = 7
) {
  // Get the role
  const role = await db.query.roles.findFirst({
    where: (r, { eq, or, and, isNull }) => 
      and(
        eq(r.slug, roleSlug),
        or(
          isNull(r.organizationId),
          eq(r.organizationId, session.organizationId)
        )
      ),
  });

  if (!role) {
    throw new Error(`Role "${roleSlug}" not found`);
  }

  // Check if user can invite this role
  const canInvite = canInviteRole(session, roleSlug as any);
  if (!canInvite.allowed) {
    throw new Error(canInvite.reason || "Cannot invite this role");
  }

  // Check if user already exists in organization
  const existingUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  });

  if (existingUser) {
    const existingMember = await db.query.organizationMembers.findFirst({
      where: (m, { eq, and }) => 
        and(
          eq(m.userId, existingUser.id),
          eq(m.organizationId, session.organizationId)
        ),
    });

    if (existingMember) {
      throw new Error("User is already a member of this organization");
    }
  }

  // Check for existing pending invitation
  const existingInvitation = await db.query.invitations.findFirst({
    where: (i, { eq, and }) => 
      and(
        eq(i.email, email),
        eq(i.organizationId, session.organizationId),
        eq(i.status, "pending")
      ),
  });

  if (existingInvitation) {
    throw new Error("An invitation is already pending for this email");
  }

  // Create invitation
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const [invitation] = await db.insert(invitations).values({
    organizationId: session.organizationId,
    email,
    roleId: role.id,
    token,
    status: "pending",
    invitedBy: session.user.userId,
    expiresAt,
  }).returning();

  return {
    invitation,
    inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`,
  };
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(token: string, userId: string) {
  const invitation = await db.query.invitations.findFirst({
    where: (i, { eq }) => eq(i.token, token),
  });

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.status !== "pending") {
    throw new Error(`Invitation is ${invitation.status}`);
  }

  if (new Date() > invitation.expiresAt) {
    await db.update(invitations)
      .set({ status: "expired" })
      .where(eq(invitations.id, invitation.id));
    throw new Error("Invitation has expired");
  }

  // Add user to organization
  await db.insert(organizationMembers).values({
    organizationId: invitation.organizationId,
    userId,
    roleId: invitation.roleId,
    invitedBy: invitation.invitedBy,
  });

  // Update invitation status
  await db.update(invitations)
    .set({ 
      status: "accepted",
      acceptedAt: new Date(),
    })
    .where(eq(invitations.id, invitation.id));

  return invitation;
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(session: TenantSession, invitationId: number) {
  const invitation = await db.query.invitations.findFirst({
    where: (i, { eq, and }) => 
      and(
        eq(i.id, invitationId),
        eq(i.organizationId, session.organizationId)
      ),
  });

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.status !== "pending") {
    throw new Error("Can only revoke pending invitations");
  }

  await db.update(invitations)
    .set({ status: "revoked" })
    .where(eq(invitations.id, invitationId));
}

// ============================================
// EVENT PARTICIPANT HELPERS
// ============================================

/**
 * Add a participant to an event (vendor, client, etc.)
 */
export async function addEventParticipant(
  session: TenantSession,
  eventId: number,
  params: {
    userId?: string;
    vendorId?: number;
    clientId?: number;
    type: "planner" | "vendor" | "client" | "assistant" | "guest";
    role?: string;
  }
) {
  // Verify event belongs to organization
  const event = await db.query.events.findFirst({
    where: (e, { eq, and }) => 
      and(
        eq(e.id, eventId),
        eq(e.organizationId, session.organizationId)
      ),
  });

  if (!event) {
    throw new Error("Event not found");
  }

  // Check for existing participant
  const existing = await db.query.eventParticipants.findFirst({
    where: (p, { eq, and }) => 
      and(
        eq(p.eventId, eventId),
        params.userId ? eq(p.userId, params.userId) : undefined,
        params.vendorId ? eq(p.vendorId, params.vendorId) : undefined,
        params.clientId ? eq(p.clientId, params.clientId) : undefined
      ),
  });

  if (existing) {
    throw new Error("Participant already added to this event");
  }

  const [participant] = await db.insert(eventParticipants).values({
    eventId,
    userId: params.userId,
    vendorId: params.vendorId,
    clientId: params.clientId,
    type: params.type,
    role: params.role,
    invitedBy: session.user.userId,
  }).returning();

  return participant;
}

/**
 * Remove a participant from an event
 */
export async function removeEventParticipant(
  session: TenantSession,
  eventId: number,
  participantId: number
) {
  // Verify event belongs to organization
  const event = await db.query.events.findFirst({
    where: (e, { eq, and }) => 
      and(
        eq(e.id, eventId),
        eq(e.organizationId, session.organizationId)
      ),
  });

  if (!event) {
    throw new Error("Event not found");
  }

  await db.delete(eventParticipants)
    .where(
      and(
        eq(eventParticipants.id, participantId),
        eq(eventParticipants.eventId, eventId)
      )
    );
}

// ============================================
// TASK PARTICIPANT HELPERS
// ============================================

/**
 * Add a participant to a task (user or vendor)
 */
export async function addTaskParticipant(
  session: TenantSession,
  taskId: number,
  params: {
    userId?: string;
    vendorId?: number;
    contactId?: number;
    type: "planner" | "vendor" | "client" | "assistant" | "guest" | "contact";
    canEdit?: boolean;
    canComment?: boolean;
  }
) {
  // Must have either userId, vendorId, or contactId
  if (!params.userId && !params.vendorId && !params.contactId) {
    throw new Error("Either userId, vendorId, or contactId is required");
  }

  // Verify task belongs to organization
  const task = await db.query.tasks.findFirst({
    where: (t, { eq, and }) => 
      and(
        eq(t.id, taskId),
        eq(t.organizationId, session.organizationId)
      ),
  });

  if (!task) {
    throw new Error("Task not found");
  }

  // Check for existing participant using standard query builder
  let existing = null;
  if (params.userId) {
    const [found] = await db
      .select({ id: taskParticipants.id })
      .from(taskParticipants)
      .where(and(eq(taskParticipants.taskId, taskId), eq(taskParticipants.userId, params.userId)))
      .limit(1);
    if (found) throw new Error("User is already a participant of this task");
  } else if (params.vendorId) {
    const [found] = await db
      .select({ id: taskParticipants.id })
      .from(taskParticipants)
      .where(and(eq(taskParticipants.taskId, taskId), eq(taskParticipants.vendorId, params.vendorId)))
      .limit(1);
    if (found) throw new Error("Vendor is already a participant of this task");
  } else if (params.contactId) {
    const [found] = await db
      .select({ id: taskParticipants.id })
      .from(taskParticipants)
      .where(and(eq(taskParticipants.taskId, taskId), eq(taskParticipants.contactId, params.contactId)))
      .limit(1);
    if (found) throw new Error("Contact is already a participant of this task");
  }

  const [participant] = await db.insert(taskParticipants).values({
    taskId,
    userId: params.userId,
    vendorId: params.vendorId,
    contactId: params.contactId,
    type: params.type,
    canEdit: params.canEdit ?? false,
    canComment: params.canComment ?? true,
    addedBy: session.user.userId,
  }).returning();

  // Send email notification to contact if contactId is provided
  if (params.contactId) {
    try {
      const contact = await db.query.contacts.findFirst({
        where: (c, { eq }) => eq(c.id, params.contactId!),
      });
      
      const org = await db.query.organizations.findFirst({
        where: (o, { eq }) => eq(o.id, session.organizationId),
      });
      
      if (contact?.email && org) {
        await sendContactTaskNotificationEmail(
          contact.email,
          contact.name,
          task.title,
          org.name,
          session.user.name || session.user.email
        );
      }
    } catch (emailError) {
      // Don't fail the operation if email fails
      console.error("Failed to send contact notification email:", emailError);
    }
  }

  return participant;
}

/**
 * Remove a participant from a task
 */
export async function removeTaskParticipant(
  session: TenantSession,
  taskId: number,
  participantId: number
) {
  // Verify task belongs to organization
  const task = await db.query.tasks.findFirst({
    where: (t, { eq, and }) => 
      and(
        eq(t.id, taskId),
        eq(t.organizationId, session.organizationId)
      ),
  });

  if (!task) {
    throw new Error("Task not found");
  }

  await db.delete(taskParticipants)
    .where(
      and(
        eq(taskParticipants.id, participantId),
        eq(taskParticipants.taskId, taskId)
      )
    );
}

/**
 * Update participant permissions
 */
export async function updateTaskParticipant(
  session: TenantSession,
  taskId: number,
  participantId: number,
  params: {
    canEdit?: boolean;
    canComment?: boolean;
  }
) {
  // Verify task belongs to organization
  const task = await db.query.tasks.findFirst({
    where: (t, { eq, and }) => 
      and(
        eq(t.id, taskId),
        eq(t.organizationId, session.organizationId)
      ),
  });

  if (!task) {
    throw new Error("Task not found");
  }

  const [updated] = await db.update(taskParticipants)
    .set({
      canEdit: params.canEdit,
      canComment: params.canComment,
    })
    .where(
      and(
        eq(taskParticipants.id, participantId),
        eq(taskParticipants.taskId, taskId)
      )
    )
    .returning();

  return updated;
}

/**
 * Get all participants of a task (users, vendors, and contacts)
 */
export async function getTaskParticipants(taskId: number) {
  const allParticipants = await db
    .select({
      id: taskParticipants.id,
      userId: taskParticipants.userId,
      vendorId: taskParticipants.vendorId,
      contactId: taskParticipants.contactId,
      type: taskParticipants.type,
      canEdit: taskParticipants.canEdit,
      canComment: taskParticipants.canComment,
      addedAt: taskParticipants.addedAt,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      vendorName: vendors.name,
      contactName: contacts.name,
    })
    .from(taskParticipants)
    .leftJoin(users, eq(taskParticipants.userId, users.id))
    .leftJoin(vendors, eq(taskParticipants.vendorId, vendors.id))
    .leftJoin(contacts, eq(taskParticipants.contactId, contacts.id))
    .where(eq(taskParticipants.taskId, taskId));

  return allParticipants.map(p => ({
    ...p,
    name: p.userName || p.vendorName || p.contactName,
    isVendor: !!p.vendorId,
    isContact: !!p.contactId,
  }));
}

// ============================================
// COLLABORATOR CONTACT INVITATION
// ============================================

export type CollaboratorInviteResult = {
  status: "invited" | "linked" | "notified" | "no_email";
  inviteUrl?: string;
};

/**
 * Invite a contact to the platform when they are added as an event collaborator.
 * Handles 4 cases:
 *   1. Contact has no email → return no_email
 *   2. User exists + already org member → link userId, notify
 *   3. User exists + NOT org member → add to org as client, link userId, notify
 *   4. User does NOT exist → create invitation, send invite email
 */
export async function inviteCollaboratorContact(
  session: TenantSession,
  contactId: number,
  eventId: number
): Promise<CollaboratorInviteResult> {
  const contact = await db.query.contacts.findFirst({
    where: (c, { eq }) => eq(c.id, contactId),
  });

  if (!contact || !contact.email) {
    return { status: "no_email" };
  }

  const contactEmail = contact.email.trim().toLowerCase();

  // Get event name and org name for emails
  const event = await db.query.events.findFirst({
    where: (e, { eq }) => eq(e.id, eventId),
  });
  const org = await db.query.organizations.findFirst({
    where: (o, { eq }) => eq(o.id, session.organizationId),
  });
  const inviter = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, session.user.userId),
  });

  const eventName = event?.name || "Evento";
  const orgName = org?.name || "Organización";
  const inviterName = inviter?.name || null;

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, contactEmail),
  });

  if (existingUser) {
    // Link contact to user
    await db.update(contacts)
      .set({ userId: existingUser.id })
      .where(eq(contacts.id, contactId));

    // Update event_participants to also have userId
    await db.update(eventParticipants)
      .set({ userId: existingUser.id, acceptedAt: new Date() })
      .where(
        and(
          eq(eventParticipants.eventId, eventId),
          eq(eventParticipants.contactId, contactId)
        )
      );

    // Check if already a member
    const existingMember = await db.query.organizationMembers.findFirst({
      where: (m, { eq, and }) =>
        and(
          eq(m.userId, existingUser.id),
          eq(m.organizationId, session.organizationId)
        ),
    });

    if (!existingMember) {
      // Get client role
      const clientRole = await db.query.roles.findFirst({
        where: (r, { eq }) => eq(r.slug, "client"),
      });

      if (clientRole) {
        await db.insert(organizationMembers).values({
          organizationId: session.organizationId,
          userId: existingUser.id,
          roleId: clientRole.id,
          invitedBy: session.user.userId,
          joinedAt: new Date(),
        });
      }
    }

    // Send notification email (non-blocking)
    const { sendClientCollaboratorNotificationEmail } = await import("@/lib/email");
    sendClientCollaboratorNotificationEmail(
      contactEmail,
      eventName,
      orgName,
      inviterName
    ).catch((err) => console.error("Failed to send collaborator notification:", err));

    return { status: existingMember ? "notified" : "linked" };
  }

  // User does NOT exist → create invitation
  // Check for existing pending invitation for same email+org
  const existingInvitation = await db.query.invitations.findFirst({
    where: (i, { eq, and }) =>
      and(
        eq(i.email, contactEmail),
        eq(i.organizationId, session.organizationId),
        eq(i.status, "pending")
      ),
  });

  if (existingInvitation) {
    // Update metadata if missing (invitation may have been created without contact context)
    if (!existingInvitation.metadata) {
      await db.update(invitations)
        .set({ metadata: { contactId, eventId } })
        .where(eq(invitations.id, existingInvitation.id));
    }
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${existingInvitation.token}`;
    return { status: "invited", inviteUrl };
  }

  // Get client role
  const clientRole = await db.query.roles.findFirst({
    where: (r, { eq }) => eq(r.slug, "client"),
  });

  if (!clientRole) {
    console.error("Client role not found in database");
    return { status: "no_email" };
  }

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.insert(invitations).values({
    organizationId: session.organizationId,
    email: contactEmail,
    roleId: clientRole.id,
    token,
    status: "pending",
    invitedBy: session.user.userId,
    expiresAt,
    metadata: { contactId, eventId },
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

  // Send invitation email (non-blocking)
  const { sendClientCollaboratorInviteEmail } = await import("@/lib/email");
  sendClientCollaboratorInviteEmail(
    contactEmail,
    eventName,
    orgName,
    inviterName,
    inviteUrl
  ).catch((err) => console.error("Failed to send collaborator invite:", err));

  return { status: "invited", inviteUrl };
}
