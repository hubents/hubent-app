import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptionPlans } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/session";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requirePlatformAdmin();

    const plans = await db
      .select()
      .from(subscriptionPlans)
      .orderBy(subscriptionPlans.sortOrder);

    return NextResponse.json({ success: true, data: plans });
  } catch (error) {
    console.error("GET /api/admin/plans error:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener planes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const body = await request.json();
    const {
      name,
      slug,
      description,
      orgType,
      priceMonthly,
      priceYearly,
      currency,
      features,
      limits,
      isActive,
      highlighted,
      sortOrder,
      trialDays,
    } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: "Nombre y slug son requeridos" },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.slug, slug),
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Ya existe un plan con ese slug" },
        { status: 409 }
      );
    }

    const [newPlan] = await db
      .insert(subscriptionPlans)
      .values({
        name,
        slug,
        description: description || null,
        orgType: orgType || "tenant",
        priceMonthly: priceMonthly || "0",
        priceYearly: priceYearly || "0",
        currency: currency || "EUR",
        features: features || [],
        limits: limits || { maxUsers: 1, maxEvents: 1, maxStorage: 500 },
        isActive: isActive ?? true,
        highlighted: highlighted ?? false,
        sortOrder: sortOrder ?? 0,
        trialDays: trialDays ?? 14,
      })
      .returning();

    await logAudit({
      actorId: session.user.userId,
      actorEmail: session.user.email,
      action: "plan.create",
      resource: "subscription_plan",
      resourceId: newPlan.id.toString(),
      details: { name, slug, priceMonthly },
    });

    return NextResponse.json({ success: true, data: newPlan });
  } catch (error) {
    console.error("POST /api/admin/plans error:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear plan" },
      { status: 500 }
    );
  }
}
