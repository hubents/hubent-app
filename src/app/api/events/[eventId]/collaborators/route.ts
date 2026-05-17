import { NextRequest } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { getEventParticipants, addEventParticipant } from "@/lib/events";
import { inviteCollaboratorContact } from "@/lib/invitations";
import { sendClientCollaboratorNotificationEmail } from "@/lib/email";
import { db } from "@/db";
import { events, organizationMembers, contacts, vendors, invitations, users, organizations, eventCollaborations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { apiHandler, ok, created, notFound, badRequest } from "@/lib/api-handler";

const addCollaboratorSchema = z.object({
  userId: z.string().optional(),
  contactId: z.number().int().positive().optional(),
  vendorId: z.number().int().positive().optional(),
  type: z.enum(["planner", "vendor", "client", "assistant", "guest", "contact"]).default("planner"),
  role: z.string().optional(),
  permissions: z.record(z.string(), z.string()).optional(),
}).refine(d => d.userId || d.contactId || d.vendorId, {
  message: "Se requiere userId, contactId o vendorId",
});

type RouteParams = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/collaborators
 * List all collaborators (participants) of an event
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const id = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(id, "general", "view");

    // Verify event belongs to org
    const event = await db.query.events.findFirst({
      where: (e, { eq, and }) =>
        and(eq(e.id, id), eq(e.organizationId, session.organizationId)),
      columns: { id: true },
    });

    if (!event) {
      return notFound("Evento no encontrado");
    }

    const participants = await getEventParticipants(id);

    // Enrich contact participants with invitation status
    const contactEmails = participants
      .filter(p => p.contactId && p.contactEmail)
      .map(p => p.contactEmail!.toLowerCase());

    let orgInvitations: { id: number; email: string; status: string | null; expiresAt: Date }[] = [];
    if (contactEmails.length > 0) {
      orgInvitations = await db
        .select({ id: invitations.id, email: invitations.email, status: invitations.status, expiresAt: invitations.expiresAt })
        .from(invitations)
        .where(eq(invitations.organizationId, session.organizationId));
    }

    // Enrich vendor participants with event_collaborations status for partner orgs
    const providerOrgIds = participants
      .filter(p => p.vendorId && !p.contactId && p.providerOrgId)
      .map(p => p.providerOrgId!);

    let collabStatusMap = new Map<number, string>();
    if (providerOrgIds.length > 0) {
      const collabs = await db
        .select({ guestOrgId: eventCollaborations.guestOrgId, status: eventCollaborations.status })
        .from(eventCollaborations)
        .where(eq(eventCollaborations.eventId, id));
      for (const c of collabs) {
        if (c.guestOrgId && providerOrgIds.includes(c.guestOrgId)) {
          collabStatusMap.set(c.guestOrgId, c.status);
        }
      }
    }

    const enriched = participants.map(p => {
      const base = { invitationStatus: null as string | null, invitationId: null as number | null, invitationExpiresAt: null as string | null };

      // Vendor-backed partner org: derive status from event_collaborations
      if (!p.contactId && p.vendorId && p.providerOrgId) {
        const collabStatus = collabStatusMap.get(p.providerOrgId);
        if (collabStatus === "active") return { ...p, ...base, invitationStatus: "active" };
        if (collabStatus === "pending") return { ...p, ...base, invitationStatus: "collab_pending" };
        return { ...p, ...base };
      }

      if (!p.contactId) return { ...p, ...base };
      if (p.acceptedAt || p.userId) return { ...p, ...base, invitationStatus: "active" };
      if (!p.contactEmail) return { ...p, ...base, invitationStatus: "no_email" };
      const inv = orgInvitations.find(
        i => i.email.toLowerCase() === p.contactEmail!.toLowerCase() && i.status === "pending"
      );
      if (inv) return { ...p, ...base, invitationStatus: "pending", invitationId: inv.id, invitationExpiresAt: inv.expiresAt.toISOString() };
      return { ...p, ...base, invitationStatus: "not_invited" };
    });

    // Append event_collaborations rows that have no matching event_participant
    const existingProviderOrgIds = new Set(
      participants.filter(p => p.providerOrgId).map(p => p.providerOrgId!)
    );

    const orgCollabs = await db
      .select({
        id: eventCollaborations.id,
        guestOrgId: eventCollaborations.guestOrgId,
        status: eventCollaborations.status,
        permissions: eventCollaborations.permissions,
        invitedAt: eventCollaborations.invitedAt,
        acceptedAt: eventCollaborations.acceptedAt,
        guestName: organizations.name,
        guestSlug: organizations.slug,
        guestCategory: organizations.providerCategory,
      })
      .from(eventCollaborations)
      .leftJoin(organizations, eq(organizations.id, eventCollaborations.guestOrgId))
      .where(
        and(
          eq(eventCollaborations.eventId, id),
          eq(eventCollaborations.hostOrgId, session.organizationId),
        ),
      );

    for (const collab of orgCollabs) {
      if (!collab.guestOrgId || existingProviderOrgIds.has(collab.guestOrgId)) continue;
      enriched.push({
        id: collab.id,
        userId: null,
        clientId: null,
        contactId: null,
        vendorId: null,
        providerOrgId: collab.guestOrgId,
        userName: null,
        userEmail: null,
        userImage: null,
        contactName: null,
        contactEmail: null,
        vendorName: collab.guestName,
        vendorCategory: collab.guestCategory,
        type: "partner",
        role: "partner",
        permissions: collab.permissions as Record<string, string> | null,
        invitedAt: collab.invitedAt ? collab.invitedAt.toISOString() : null,
        acceptedAt: collab.acceptedAt ? collab.acceptedAt.toISOString() : null,
        invitationStatus: collab.status === "active" ? "active" : collab.status === "pending" ? "collab_pending" : null,
        invitationId: null,
        invitationExpiresAt: null,
      } as unknown as (typeof enriched)[number]);
    }

    return ok(enriched);
  }, "GET /api/events/[eventId]/collaborators");
}

/**
 * POST /api/events/[eventId]/collaborators
 * Add a collaborator to an event
 * Body: { userId?, contactId?, vendorId?, type?, role?, permissions? }
 * At least one of userId, contactId, or vendorId is required.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const id = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(id, "settings", "edit");
    const body = await request.json();

    const parsed = addCollaboratorSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message || "Datos inválidos");
    }

    const { userId, contactId, vendorId, type, role, permissions } = parsed.data;

    // Verify event belongs to org
    const event = await db.query.events.findFirst({
      where: (e, { eq, and }) =>
        and(eq(e.id, id), eq(e.organizationId, session.organizationId)),
      columns: { id: true },
    });

    if (!event) {
      return notFound("Evento no encontrado");
    }

    // If userId provided, verify user is a member of the organization
    if (userId) {
      const [member] = await db
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.organizationId, session.organizationId)
          )
        )
        .limit(1);

      if (!member) {
        return badRequest("El usuario no es miembro de la organización", "NOT_MEMBER");
      }
    }

    // If contactId provided, verify contact belongs to the organization
    if (contactId) {
      const [contact] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(eq(contacts.id, contactId), eq(contacts.organizationId, session.organizationId)))
        .limit(1);

      if (!contact) {
        return badRequest("Contacto no encontrado en esta organización", "NOT_FOUND");
      }
    }

    // If vendorId provided, verify vendor belongs to the organization
    if (vendorId) {
      const [vendor] = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(and(eq(vendors.id, vendorId), eq(vendors.organizationId, session.organizationId)))
        .limit(1);

      if (!vendor) {
        return badRequest("Proveedor no encontrado en esta organización", "NOT_FOUND");
      }
    }

    const participant = await addEventParticipant(session, id, {
      userId,
      contactId,
      vendorId,
      type,
      role,
      permissions,
    });

    // Auto-invite contact to the platform (truly non-blocking — don't delay response)
    if (contactId && (type === "contact" || type === "client")) {
      inviteCollaboratorContact(session, contactId, id, role || type)
        .then(result => console.log(`Auto-invite contact ${contactId} result:`, result.status))
        .catch(err => console.error("Auto-invite failed:", err));
    }

    // Notify existing user when added as collaborator (non-blocking)
    if (userId) {
      (async () => {
        try {
          const [user, evt, org] = await Promise.all([
            db.query.users.findFirst({ where: eq(users.id, userId), columns: { email: true, name: true } }),
            db.query.events.findFirst({ where: eq(events.id, id), columns: { name: true } }),
            db.query.organizations.findFirst({ where: eq(organizations.id, session.organizationId), columns: { name: true } }),
          ]);
          if (user?.email && evt?.name && org?.name) {
            await sendClientCollaboratorNotificationEmail(
              user.email,
              evt.name,
              org.name,
              session.user.name || null,
              role || "colaborador"
            );
            console.log(`Collaborator notification sent to ${user.email} for event ${evt.name}`);
          }
        } catch (err) {
          console.error("Collaborator notification email failed:", err);
        }
      })();
    }

    return created(participant);
  }, "POST /api/events/[eventId]/collaborators");
}
