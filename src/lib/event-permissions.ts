import { db } from "@/db";
import { eventParticipants, eventCollaborations, taskParticipants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { TenantSession, EventSectionPermissions, EventSectionLevel } from "@/types";

// ============================================
// EVENT-LEVEL PERMISSION HELPERS
// ============================================

/**
 * Get a user's event participant record (including permissions)
 * Returns null if user is not a participant of the event
 */
export async function getEventParticipant(userId: string, eventId: number) {
  const [participant] = await db
    .select({
      id: eventParticipants.id,
      type: eventParticipants.type,
      role: eventParticipants.role,
      permissions: eventParticipants.permissions,
    })
    .from(eventParticipants)
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.userId, userId)
      )
    )
    .limit(1);

  return participant || null;
}

/**
 * Get section permissions for a user on an event
 * Returns the permissions JSON or null if not a participant
 */
export async function getEventPermissions(
  userId: string,
  eventId: number
): Promise<EventSectionPermissions | null> {
  const participant = await getEventParticipant(userId, eventId);
  if (!participant) return null;

  return (participant.permissions as EventSectionPermissions) || defaultFullPermissions();
}

/**
 * Check if a user has access to a specific section of an event
 * For non-eventScoped roles, always returns true (bypass)
 */
export async function checkEventSectionAccess(
  session: TenantSession,
  eventId: number,
  section: keyof EventSectionPermissions,
  requiredLevel: "view" | "edit" = "view"
): Promise<{ allowed: boolean; reason?: string }> {
  // Non-scoped roles bypass event-level checks
  if (!session.eventScoped) {
    return { allowed: true };
  }

  // Platform admins and impersonation bypass
  if (session.user.platformLevel === "super_admin" || session.isImpersonating) {
    return { allowed: true };
  }

  const permissions = await getEventPermissions(session.user.userId, eventId);

  if (!permissions) {
    return { allowed: false, reason: "No eres colaborador de este evento" };
  }

  const sectionLevel = permissions[section] || "none";

  if (sectionLevel === "none") {
    return { allowed: false, reason: `No tienes acceso a la sección ${section}` };
  }

  if (requiredLevel === "edit" && sectionLevel === "view") {
    return { allowed: false, reason: `Solo tienes acceso de lectura a ${section}` };
  }

  return { allowed: true };
}

/**
 * Get all events a user participates in, with their section permissions.
 * Used by calendar API to filter data for eventScoped users.
 */
export async function getUserEventAccess(userId: string): Promise<
  Array<{ eventId: number; permissions: EventSectionPermissions }>
> {
  const rows = await db
    .select({
      eventId: eventParticipants.eventId,
      permissions: eventParticipants.permissions,
    })
    .from(eventParticipants)
    .where(eq(eventParticipants.userId, userId));

  return rows.map((r) => ({
    eventId: r.eventId,
    permissions: (r.permissions as EventSectionPermissions) || defaultFullPermissions(),
  }));
}

/**
 * Check if a user is a participant of a specific task
 */
export async function getTaskParticipantAccess(userId: string, taskId: number) {
  const [participant] = await db
    .select({
      id: taskParticipants.id,
      canEdit: taskParticipants.canEdit,
      canComment: taskParticipants.canComment,
    })
    .from(taskParticipants)
    .where(
      and(
        eq(taskParticipants.taskId, taskId),
        eq(taskParticipants.userId, userId)
      )
    )
    .limit(1);

  return participant || null;
}

/**
 * Check if the current org is a guest collaborator on this event (has any event_collaborations row).
 * Used by requireEventSectionAccess to decide whether collaboration permissions should override org permissions.
 */
export async function isGuestCollaborator(
  organizationId: number,
  eventId: number,
): Promise<boolean> {
  const [collab] = await db
    .select({ id: eventCollaborations.id })
    .from(eventCollaborations)
    .where(
      and(
        eq(eventCollaborations.eventId, eventId),
        eq(eventCollaborations.guestOrgId, organizationId),
      ),
    )
    .limit(1);

  return !!collab;
}

/**
 * Check if a guest org has section access via event_collaborations.
 * Used as fallback when event_participants check fails (cross-org access).
 */
export async function checkCollaborationSectionAccess(
  session: TenantSession,
  eventId: number,
  section: keyof EventSectionPermissions,
  requiredLevel: "view" | "edit" = "view",
): Promise<{ allowed: boolean; reason?: string }> {
  const [collab] = await db
    .select({ permissions: eventCollaborations.permissions })
    .from(eventCollaborations)
    .where(
      and(
        eq(eventCollaborations.eventId, eventId),
        eq(eventCollaborations.guestOrgId, session.organizationId),
        eq(eventCollaborations.status, "active"),
      ),
    )
    .limit(1);

  if (!collab) {
    return { allowed: false, reason: "No tienes acceso a este evento como colaborador" };
  }

  const perms = (collab.permissions || {}) as Record<string, string>;
  const sectionLevel = perms[section] || "none";

  if (sectionLevel === "none") {
    return { allowed: false, reason: `No tienes acceso a la sección ${section}` };
  }

  if (requiredLevel === "edit" && sectionLevel === "view") {
    return { allowed: false, reason: `Solo tienes acceso de lectura a ${section}` };
  }

  return { allowed: true };
}

/**
 * Default full permissions (for participants without explicit permissions)
 */
function defaultFullPermissions(): EventSectionPermissions {
  return {
    general: "view",
    tasks: "none",
    guests: "none",
    rsvp: "none",
    vendors: "none",
    partners: "none",
    finances: "none",
    runsheet: "none",
    calendar: "none",
    settings: "none",
  };
}

/**
 * Section labels for UI
 */
export const EVENT_SECTION_LABELS: Record<keyof EventSectionPermissions, string> = {
  general: "General",
  tasks: "Tareas",
  guests: "Lista de Invitados",
  rsvp: "RSVP",
  vendors: "Partners",
  partners: "Partners",
  finances: "Finanzas",
  runsheet: "Orden del día",
  calendar: "Calendario",
  settings: "Configuración",
};

/**
 * Available levels per section
 */
export const EVENT_SECTION_LEVELS: Record<keyof EventSectionPermissions, EventSectionLevel[]> = {
  general: ["none", "view", "edit"],
  tasks: ["none", "view", "edit"],
  guests: ["none", "view", "edit"],
  rsvp: ["none", "view", "edit"],
  vendors: ["none", "view"],
  partners: ["none", "view"],
  finances: ["none", "view"],
  runsheet: ["none", "view", "edit"],
  calendar: ["none", "view", "edit"],
  settings: ["none"],
};
