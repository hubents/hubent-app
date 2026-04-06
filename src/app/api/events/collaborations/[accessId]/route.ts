import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { eventCollaborations, providerEventAccess } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

type RouteParams = { params: Promise<{ accessId: string }> };

const actionSchema = z.object({
  action: z.enum(["accept", "reject", "revoke"]),
});

/**
 * PATCH /api/events/collaborations/[accessId]
 * Accept, reject, or revoke an event collaboration
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { accessId } = await params;
    const aid = parseInt(accessId);

    const body = await request.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid action. Use accept, reject, or revoke." } },
        { status: 400 },
      );
    }

    const { action } = parsed.data;

    // Try new event_collaborations table first
    const collab = await db.query.eventCollaborations.findFirst({
      where: eq(eventCollaborations.id, aid),
    });

    if (collab) {
      if (action === "revoke") {
        if (collab.hostOrgId !== session.organizationId) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "Only the host can revoke" } },
            { status: 403 },
          );
        }
        if (collab.status !== "active" && collab.status !== "pending") {
          return NextResponse.json(
            { success: false, error: { code: "CONFLICT", message: `Cannot revoke: status is ${collab.status}` } },
            { status: 409 },
          );
        }
        await db
          .update(eventCollaborations)
          .set({ status: "revoked", updatedAt: new Date() })
          .where(eq(eventCollaborations.id, aid));

        return NextResponse.json({ success: true, data: { id: aid, status: "revoked" } });
      }

      // accept / reject: must be the guest org
      if (collab.guestOrgId !== session.organizationId) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Not authorized for this invitation" } },
          { status: 403 },
        );
      }

      if (collab.status !== "pending") {
        return NextResponse.json(
          { success: false, error: { code: "CONFLICT", message: `Invitation already ${collab.status}` } },
          { status: 409 },
        );
      }

      const newStatus = action === "accept" ? "active" : "rejected";
      await db
        .update(eventCollaborations)
        .set({
          status: newStatus,
          acceptedAt: action === "accept" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(eventCollaborations.id, aid));

      return NextResponse.json({ success: true, data: { id: aid, status: newStatus } });
    }

    // Fallback: legacy provider_event_access table
    const access = await db.query.providerEventAccess.findFirst({
      where: and(
        eq(providerEventAccess.id, aid),
        eq(providerEventAccess.providerOrgId, session.organizationId),
      ),
    });

    if (!access) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Invitation not found" } },
        { status: 404 },
      );
    }

    if (access.status !== "pending") {
      return NextResponse.json(
        { success: false, error: { code: "CONFLICT", message: `Invitation already ${access.status}` } },
        { status: 409 },
      );
    }

    const newStatus = action === "accept" ? "active" : "rejected";
    await db
      .update(providerEventAccess)
      .set({
        status: newStatus,
        acceptedAt: action === "accept" ? new Date() : null,
      })
      .where(eq(providerEventAccess.id, aid));

    return NextResponse.json({ success: true, data: { id: aid, status: newStatus } });
  } catch (error) {
    console.error("PATCH /api/events/collaborations/[accessId] error:", error);
    const message = error instanceof Error ? error.message : "Failed to update invitation";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status },
    );
  }
}
