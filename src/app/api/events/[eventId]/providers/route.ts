import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { providerEventAccess, eventCollaborations, organizations, events, users, eventParticipants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { sendProviderEventInvitationEmail } from "@/lib/email";
import { ensureVendorForProviderOrg, ensureEventVendor, autoLinkVendorToEventTasks } from "@/lib/cross-org";
import { notifyProviderInvited } from "@/lib/push-notifications";

type RouteParams = { params: Promise<{ eventId: string }> };

const inviteSchema = z.object({
  providerOrgId: z.number().optional(),
  vendorId: z.number().optional(),
});

/**
 * GET /api/events/[eventId]/providers
 * List providers assigned to an event
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const eid = parseInt(eventId);
    const session = await requireEventSectionAccess(eid, "vendors", "view");

    // Verify event belongs to caller's org
    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eid), eq(events.organizationId, session.organizationId)),
    });
    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Event not found" } },
        { status: 404 }
      );
    }

    const access = await db
      .select({
        id: providerEventAccess.id,
        providerOrgId: providerEventAccess.providerOrgId,
        vendorId: providerEventAccess.vendorId,
        status: providerEventAccess.status,
        invitedAt: providerEventAccess.invitedAt,
        acceptedAt: providerEventAccess.acceptedAt,
        providerName: organizations.name,
        providerSlug: organizations.slug,
        providerCategory: organizations.providerCategory,
        providerLogo: organizations.logo,
      })
      .from(providerEventAccess)
      .innerJoin(organizations, eq(organizations.id, providerEventAccess.providerOrgId))
      .where(
        and(
          eq(providerEventAccess.eventId, eid),
          eq(providerEventAccess.plannerOrgId, session.organizationId)
        )
      );

    return NextResponse.json({ success: true, data: access });
  } catch (error) {
    console.error("GET /api/events/[eventId]/providers error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}

/**
 * POST /api/events/[eventId]/providers
 * Invite a provider org to an event
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const eid = parseInt(eventId);
    const session = await requireEventSectionAccess(eid, "vendors", "view");

    // Verify event belongs to caller's org
    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eid), eq(events.organizationId, session.organizationId)),
    });
    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Event not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid data" } },
        { status: 400 }
      );
    }

    const { providerOrgId, vendorId } = parsed.data;

    if (!providerOrgId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "providerOrgId is required" } },
        { status: 400 }
      );
    }

    // Verify provider org exists and is a provider
    const providerOrg = await db.query.organizations.findFirst({
      where: eq(organizations.id, providerOrgId),
    });

    if (!providerOrg || providerOrg.orgType !== "provider") {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Provider organization not found" } },
        { status: 404 }
      );
    }

    const finalProviderOrgId = providerOrgId;

    // Check for duplicate
    const existing = await db.query.providerEventAccess.findFirst({
      where: and(
        eq(providerEventAccess.providerOrgId, finalProviderOrgId),
        eq(providerEventAccess.eventId, eid)
      ),
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE", message: "Provider already assigned to this event" } },
        { status: 409 }
      );
    }

    // Auto-link: ensure a local vendor record exists for this provider org (BLOCKING)
    let finalVendorId = vendorId || null;
    const linkedVendorId = await ensureVendorForProviderOrg(
      session.organizationId,
      finalProviderOrgId,
      session.user.userId
    );
    finalVendorId = finalVendorId || linkedVendorId;

    // Ensure eventVendors record exists
    await ensureEventVendor(eid, finalVendorId, providerOrg.providerCategory);

    const [newAccess] = await db
      .insert(providerEventAccess)
      .values({
        providerOrgId: finalProviderOrgId,
        eventId: eid,
        plannerOrgId: session.organizationId,
        vendorId: finalVendorId,
        invitedBy: session.user.userId,
        status: "active",
        acceptedAt: new Date(),
      })
      .returning();

    // Ensure bilateral event_collaborations row exists (unified host<>guest model)
    await db
      .insert(eventCollaborations)
      .values({
        eventId: eid,
        hostOrgId: session.organizationId,
        guestOrgId: finalProviderOrgId,
        status: "active",
        invitedBy: session.user.userId,
        acceptedAt: new Date(),
        permissions: {
          general: "view",
          calendar: "view",
          tasks: "view",
          partners: "none",
          finances: "none",
          rsvp: "none",
          guests: "none",
          runsheet: "none",
        },
      })
      .onConflictDoNothing({ target: [eventCollaborations.eventId, eventCollaborations.guestOrgId] });

    // Send event invitation email to provider owner (non-blocking)
    const plannerOrg = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
      columns: { name: true },
    });
    if (providerOrg.ownerId) {
      db.query.users.findFirst({ where: eq(users.id, providerOrg.ownerId) }).then((owner) => {
        if (owner?.email) {
          sendProviderEventInvitationEmail(
            owner.email,
            providerOrg.name,
            event.name || "Evento",
            event.date?.toISOString() ?? null,
            plannerOrg?.name || "Un organizador"
          ).catch((e) => console.error("Failed to send event invitation email:", e));
        }
      });
    }

    // Push notification to provider org (non-blocking)
    notifyProviderInvited(
      finalProviderOrgId,
      event.name || "Evento",
      plannerOrg?.name || "Un organizador",
      newAccess.id
    ).catch((e) => console.error("Push notify provider invited failed:", e));

    // Auto-create event_participant for the vendor (BLOCKING — needed for collaborator list)
    const [existingParticipant] = await db
      .select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(and(
        eq(eventParticipants.eventId, eid),
        eq(eventParticipants.vendorId, finalVendorId)
      ))
      .limit(1);

    if (!existingParticipant) {
      await db.insert(eventParticipants).values({
        eventId: eid,
        vendorId: finalVendorId,
        type: "vendor",
        role: "vendor",
        permissions: {
          general: "view",
          tasks: "view",
          guests: "none",
          rsvp: "none",
          vendors: "view",
          finances: "none",
          settings: "none",
        },
        invitedBy: session.user.userId,
      });
    }

    // Auto-link vendor to existing tasks in this event (non-blocking)
    autoLinkVendorToEventTasks(eid, finalVendorId, session.user.userId)
      .then((result) => {
        console.log(`[inviteProvider] eventId=${eid} providerOrgId=${finalProviderOrgId} vendorId=${finalVendorId} tasksLinked=${result.linked}`);
      })
      .catch((err) => console.error("[inviteProvider] autoLinkVendorToEventTasks failed:", err));

    return NextResponse.json({ success: true, data: { ...newAccess, vendorId: finalVendorId } }, { status: 201 });
  } catch (error) {
    console.error("POST /api/events/[eventId]/providers error:", error);
    const message = error instanceof Error ? error.message : "Failed to invite";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "INVITE_ERROR", message } },
      { status }
    );
  }
}
