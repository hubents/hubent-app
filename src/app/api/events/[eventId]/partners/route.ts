import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess, requireAuth } from "@/lib/session";
import { db } from "@/db";
import { eventCollaborations, organizations, events, users, notifications } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { sendProviderEventInvitationEmail } from "@/lib/email";
import { notifyProviderInvited } from "@/lib/push-notifications";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";
import { randomBytes } from "crypto";

type RouteParams = { params: Promise<{ eventId: string }> };

const inviteRegisteredSchema = z.object({
  guestOrgId: z.number(),
  permissions: z
    .record(z.string(), z.enum(["none", "view", "edit"]))
    .optional(),
});

const inviteByEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  permissions: z
    .record(z.string(), z.enum(["none", "view", "edit"]))
    .optional(),
});

const DEFAULT_COLLAB_PERMISSIONS = {
  general: "view" as const,
  calendar: "view" as const,
  tasks: "view" as const,
  partners: "none" as const,
  finances: "none" as const,
  rsvp: "none" as const,
  guests: "none" as const,
  runsheet: "none" as const,
};

/**
 * GET /api/events/[eventId]/partners
 * List org-to-org collaborations for an event
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const eid = parseInt(eventId);
    const session = await requireAuth();

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eid), eq(events.organizationId, session.organizationId)),
    });

    if (!event) {
      const collab = await db.query.eventCollaborations.findFirst({
        where: and(
          eq(eventCollaborations.eventId, eid),
          eq(eventCollaborations.guestOrgId, session.organizationId),
          eq(eventCollaborations.status, "active"),
        ),
      });
      if (!collab) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Event not found" } },
          { status: 404 },
        );
      }
    }

    const hostOrgId = event?.organizationId ?? session.organizationId;

    const collabs = await db
      .select({
        id: eventCollaborations.id,
        guestOrgId: eventCollaborations.guestOrgId,
        invitationEmail: eventCollaborations.invitationEmail,
        status: eventCollaborations.status,
        permissions: eventCollaborations.permissions,
        invitedAt: eventCollaborations.invitedAt,
        acceptedAt: eventCollaborations.acceptedAt,
        guestName: organizations.name,
        guestSlug: organizations.slug,
        guestOrgType: organizations.orgType,
        guestCategory: organizations.providerCategory,
        guestLogo: organizations.logo,
      })
      .from(eventCollaborations)
      .leftJoin(organizations, eq(organizations.id, eventCollaborations.guestOrgId))
      .where(
        and(
          eq(eventCollaborations.eventId, eid),
          eq(eventCollaborations.hostOrgId, hostOrgId),
        ),
      );

    return NextResponse.json({ success: true, data: collabs });
  } catch (error) {
    console.error("GET /api/events/[eventId]/partners error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status },
    );
  }
}

/**
 * POST /api/events/[eventId]/partners
 * Invite any org (bilateral) to collaborate on an event
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const eid = parseInt(eventId);
    const session = await requireEventSectionAccess(eid, "partners", "view");

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eid), eq(events.organizationId, session.organizationId)),
    });
    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Event not found" } },
        { status: 404 },
      );
    }

    const body = await request.json();

    // Try registered org invite first, then email invite
    const registeredParse = inviteRegisteredSchema.safeParse(body);
    const emailParse = inviteByEmailSchema.safeParse(body);

    if (!registeredParse.success && !emailParse.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Provide guestOrgId or email" } },
        { status: 400 },
      );
    }

    const permissions = (registeredParse.success ? registeredParse.data.permissions : emailParse.data?.permissions) || DEFAULT_COLLAB_PERMISSIONS;

    if (registeredParse.success) {
      const { guestOrgId } = registeredParse.data;

      if (guestOrgId === session.organizationId) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "Cannot invite your own organization" } },
          { status: 400 },
        );
      }

      const guestOrg = await db.query.organizations.findFirst({
        where: eq(organizations.id, guestOrgId),
      });
      if (!guestOrg) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Organization not found" } },
          { status: 404 },
        );
      }

      // Duplicate check handled by UNIQUE constraint; catch the error
      try {
        const [newCollab] = await db
          .insert(eventCollaborations)
          .values({
            eventId: eid,
            hostOrgId: session.organizationId,
            guestOrgId,
            permissions,
            status: "pending",
            invitedBy: session.user.userId,
          })
          .returning();

        // Send email to guest org owner (non-blocking)
        const hostOrg = await db.query.organizations.findFirst({
          where: eq(organizations.id, session.organizationId),
          columns: { name: true },
        });

        if (guestOrg.ownerId) {
          db.query.users
            .findFirst({ where: eq(users.id, guestOrg.ownerId) })
            .then((owner) => {
              if (owner?.email) {
                sendProviderEventInvitationEmail(
                  owner.email,
                  guestOrg.name,
                  event.name || "Evento",
                  event.date?.toISOString() ?? null,
                  hostOrg?.name || "Un organizador",
                ).catch((e) => console.error("Failed to send partner invitation email:", e));
              }
            });
        }

        // Push notification (non-blocking)
        notifyProviderInvited(
          guestOrgId,
          event.name || "Evento",
          hostOrg?.name || "Un organizador",
          newCollab.id,
        ).catch((e) => console.error("Push notify partner invited failed:", e));

        // Dispatch webhook
        void dispatchWebhookEvent(session.organizationId, "collaboration.invited", {
          id: newCollab.id, eventId: eid, guestOrgId, guestOrgName: guestOrg.name,
        }).catch(() => {});

        // Insert notification for guest org owner
        if (guestOrg.ownerId) {
          db.insert(notifications).values({
            userId: guestOrg.ownerId,
            organizationId: guestOrgId,
            type: "collaboration_invitation",
            title: "Invitación a colaborar",
            body: `${hostOrg?.name || "Un organizador"} te invitó a colaborar en ${event.name || "un evento"}`,
            data: { eventId: String(eid), collaborationId: String(newCollab.id) },
          }).execute().catch((e) => console.error("Insert collaboration notification failed:", e));
        }

        return NextResponse.json({ success: true, data: newCollab }, { status: 201 });
      } catch (err: unknown) {
        if (err && typeof err === "object" && "code" in err && err.code === "23505") {
          return NextResponse.json(
            { success: false, error: { code: "DUPLICATE", message: "Partner already invited to this event" } },
            { status: 409 },
          );
        }
        throw err;
      }
    }

    // Email-based invitation for unregistered orgs
    if (emailParse.success) {
      const { email } = emailParse.data;
      const token = randomBytes(32).toString("hex");

      const [newCollab] = await db
        .insert(eventCollaborations)
        .values({
          eventId: eid,
          hostOrgId: session.organizationId,
          invitationEmail: email,
          invitationToken: token,
          permissions,
          status: "pending_registration",
          invitedBy: session.user.userId,
        })
        .returning();

      const hostOrg = await db.query.organizations.findFirst({
        where: eq(organizations.id, session.organizationId),
        columns: { name: true },
      });

      sendProviderEventInvitationEmail(
        email,
        emailParse.data.name || email,
        event.name || "Evento",
        event.date?.toISOString() ?? null,
        hostOrg?.name || "Un organizador",
      ).catch((e) => console.error("Failed to send partner invitation email:", e));

      return NextResponse.json({ success: true, data: newCollab }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request" } },
      { status: 400 },
    );
  } catch (error) {
    console.error("POST /api/events/[eventId]/partners error:", error);
    const message = error instanceof Error ? error.message : "Failed to invite";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "INVITE_ERROR", message } },
      { status },
    );
  }
}
