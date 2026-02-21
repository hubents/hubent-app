import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getEventParticipants, addEventParticipant } from "@/lib/events";
import { inviteCollaboratorContact } from "@/lib/invitations";
import { db } from "@/db";
import { events, organizationMembers, contacts, vendors, invitations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

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
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("events:read");
    const { eventId } = await params;
    const id = parseInt(eventId, 10);

    // Verify event belongs to org
    const event = await db.query.events.findFirst({
      where: (e, { eq, and }) =>
        and(eq(e.id, id), eq(e.organizationId, session.organizationId)),
      columns: { id: true },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Evento no encontrado" } },
        { status: 404 }
      );
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

    const enriched = participants.map(p => {
      const base = { invitationStatus: null as string | null, invitationId: null as number | null, invitationExpiresAt: null as string | null };
      if (!p.contactId) return { ...p, ...base };
      if (p.acceptedAt || p.userId) return { ...p, ...base, invitationStatus: "active" };
      if (!p.contactEmail) return { ...p, ...base, invitationStatus: "no_email" };
      const inv = orgInvitations.find(
        i => i.email.toLowerCase() === p.contactEmail!.toLowerCase() && i.status === "pending"
      );
      if (inv) return { ...p, ...base, invitationStatus: "pending", invitationId: inv.id, invitationExpiresAt: inv.expiresAt.toISOString() };
      return { ...p, ...base, invitationStatus: "not_invited" };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener colaboradores";
    const status = message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}

/**
 * POST /api/events/[eventId]/collaborators
 * Add a collaborator to an event
 * Body: { userId?, contactId?, vendorId?, type?, role?, permissions? }
 * At least one of userId, contactId, or vendorId is required.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("events:update");
    const { eventId } = await params;
    const id = parseInt(eventId, 10);
    const body = await request.json();

    const parsed = addCollaboratorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Datos inválidos" } },
        { status: 400 }
      );
    }

    const { userId, contactId, vendorId, type, role, permissions } = parsed.data;

    // Verify event belongs to org
    const event = await db.query.events.findFirst({
      where: (e, { eq, and }) =>
        and(eq(e.id, id), eq(e.organizationId, session.organizationId)),
      columns: { id: true },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Evento no encontrado" } },
        { status: 404 }
      );
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
        return NextResponse.json(
          { success: false, error: { code: "NOT_MEMBER", message: "El usuario no es miembro de la organización" } },
          { status: 400 }
        );
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
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Contacto no encontrado en esta organización" } },
          { status: 400 }
        );
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
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Proveedor no encontrado en esta organización" } },
          { status: 400 }
        );
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

    // Auto-invite contact to the platform
    let invitationStatus = null;
    if (contactId && (type === "contact" || type === "client")) {
      try {
        invitationStatus = await inviteCollaboratorContact(session, contactId, id, role);
      } catch (inviteErr) {
        console.error("Auto-invite failed (non-blocking):", inviteErr);
      }
    }

    return NextResponse.json({ success: true, data: { ...participant, invitationStatus } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al agregar colaborador";
    const status = message.includes("Forbidden") ? 403
      : message.includes("ya es colaborador") ? 409
      : 400;
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status }
    );
  }
}
