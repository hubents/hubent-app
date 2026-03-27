import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { providerEventAccess, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { isMarketplaceType } from "@/lib/tenant-type";

type RouteParams = { params: Promise<{ accessId: string }> };

const actionSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

/**
 * PATCH /api/vendor/events/[accessId]
 * Accept or reject an event invitation (provider side)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { accessId } = await params;
    const aid = parseInt(accessId);

    // Verify caller is a provider org
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
      columns: { orgType: true },
    });
    if (!org || !isMarketplaceType(org.orgType)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Not a provider organization" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid action" } },
        { status: 400 }
      );
    }

    // Find the access record, ensure it belongs to this provider org
    const access = await db.query.providerEventAccess.findFirst({
      where: and(
        eq(providerEventAccess.id, aid),
        eq(providerEventAccess.providerOrgId, session.organizationId),
      ),
    });

    if (!access) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Invitation not found" } },
        { status: 404 }
      );
    }

    if (access.status !== "pending") {
      return NextResponse.json(
        { success: false, error: { code: "CONFLICT", message: `Invitation already ${access.status}` } },
        { status: 409 }
      );
    }

    const { action } = parsed.data;
    const newStatus = action === "accept" ? "active" : "rejected";

    await db
      .update(providerEventAccess)
      .set({
        status: newStatus,
        acceptedAt: action === "accept" ? new Date() : null,
      })
      .where(eq(providerEventAccess.id, aid));

    return NextResponse.json({
      success: true,
      data: { id: aid, status: newStatus },
    });
  } catch (error) {
    console.error("PATCH /api/vendor/events/[accessId] error:", error);
    const message = error instanceof Error ? error.message : "Failed to update invitation";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status }
    );
  }
}
