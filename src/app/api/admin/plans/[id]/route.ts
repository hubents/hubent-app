import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptionPlans } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/session";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin();

    const { id } = await params;
    const planId = parseInt(id);
    if (isNaN(planId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }

    const plan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, planId),
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Plan no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    console.error("GET /api/admin/plans/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener plan" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePlatformAdmin();

    const { id } = await params;
    const planId = parseInt(id);
    if (isNaN(planId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }
    const body = await request.json();

    const existing = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, planId),
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Plan no encontrado" },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "name", "slug", "description", "orgType",
      "priceMonthly", "priceYearly", "currency",
      "features", "limits", "isActive", "highlighted",
      "sortOrder", "trialDays",
      "stripeProductId", "stripePriceIdMonthly", "stripePriceIdYearly",
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(subscriptionPlans)
      .set(updateData)
      .where(eq(subscriptionPlans.id, planId))
      .returning();

    await logAudit({
      actorId: session.user.userId,
      actorEmail: session.user.email,
      action: "plan.update",
      resource: "subscription_plan",
      resourceId: planId.toString(),
      details: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/admin/plans/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar plan" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePlatformAdmin();

    const { id } = await params;
    const planId = parseInt(id);
    if (isNaN(planId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }

    // Soft delete: set isActive to false
    const [updated] = await db
      .update(subscriptionPlans)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(subscriptionPlans.id, planId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Plan no encontrado" },
        { status: 404 }
      );
    }

    await logAudit({
      actorId: session.user.userId,
      actorEmail: session.user.email,
      action: "plan.delete",
      resource: "subscription_plan",
      resourceId: planId.toString(),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("DELETE /api/admin/plans/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar plan" },
      { status: 500 }
    );
  }
}
