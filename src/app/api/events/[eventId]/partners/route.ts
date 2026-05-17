import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess, requireAuth } from "@/lib/session";
import { db } from "@/db";
import { eventCollaborations, organizations, events, users, notifications } from "@/db/schema";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { sendProviderEventInvitationEmail } from "@/lib/email";
import { notifyProviderInvited } from "@/lib/push-notifications";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";
import { randomBytes } from "crypto";
import { apiHandler, ok, created, notFound, badRequest } from "@/lib/api-handler";

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
  return apiHandler(async () => {
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
        return notFound("Event not found");
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
        guestTagline: organizations.tagline,
        guestCity: organizations.city,
        guestRegion: organizations.region,
        guestVerified: organizations.verificationStatus,
      })
      .from(eventCollaborations)
      .leftJoin(organizations, eq(organizations.id, eventCollaborations.guestOrgId))
      .where(
        and(
          eq(eventCollaborations.eventId, eid),
          eq(eventCollaborations.hostOrgId, hostOrgId),
        ),
      );

    return ok(collabs);
  }, "GET /api/events/[eventId]/partners");
}

/**
 * POST /api/events/[eventId]/partners
 * Invite any org (bilateral) to collaborate on an event
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eid = parseInt(eventId);
    const session = await requireEventSectionAccess(eid, "partners", "view");

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eid), eq(events.organizationId, session.organizationId)),
    });
    if (!event) {
      return notFound("Event not found");
    }

    const body = await request.json();

    // Try registered org invite first, then email invite
    const registeredParse = inviteRegisteredSchema.safeParse(body);
    const emailParse = inviteByEmailSchema.safeParse(body);

    if (!registeredParse.success && !emailParse.success) {
      return badRequest("Provide guestOrgId or email");
    }

    const permissions = (registeredParse.success ? registeredParse.data.permissions : emailParse.data?.permissions) || DEFAULT_COLLAB_PERMISSIONS;

    if (registeredParse.success) {
      const { guestOrgId } = registeredParse.data;

      if (guestOrgId === session.organizationId) {
        return badRequest("Cannot invite your own organization");
      }

      const guestOrg = await db.query.organizations.findFirst({
        where: eq(organizations.id, guestOrgId),
      });
      if (!guestOrg) {
        return notFound("Organization not found");
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
            link: `${process.env.NEXT_PUBLIC_APP_URL || "https://app.hubents.com"}/dashboard/events`,
            data: { eventId: String(eid), collaborationId: String(newCollab.id) },
          }).execute().catch((e) => console.error("Insert collaboration notification failed:", e));
        }

        return created(newCollab);
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

      return created(newCollab);
    }

    return badRequest("Invalid request");
  }, "POST /api/events/[eventId]/partners");
}

/**
 * PATCH /api/events/[eventId]/partners
 * Update collaboration status (confirmed / rejected)
 */
const patchSchema = z.object({
  id: z.number(),
  status: z.enum(["active", "rejected", "pending"]),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eid = parseInt(eventId);
    const session = await requireAuth();

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eid), eq(events.organizationId, session.organizationId)),
    });
    if (!event) return notFound("Event not found");

    const body = patchSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return badRequest("id y status son obligatorios");

    const { id, status } = body.data;

    const [updated] = await db
      .update(eventCollaborations)
      .set({ status, ...(status === "active" ? { acceptedAt: new Date() } : {}) })
      .where(
        and(
          eq(eventCollaborations.id, id),
          eq(eventCollaborations.eventId, eid),
          eq(eventCollaborations.hostOrgId, session.organizationId),
        ),
      )
      .returning();

    if (!updated) return notFound("Collaboration not found");
    return ok(updated);
  }, "PATCH /api/events/[eventId]/partners");
}
