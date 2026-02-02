import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, organizationMembers, users, subscriptions, subscriptionPlans } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/session";

// GET single tenant with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify platform admin access
    await requirePlatformAdmin();

    const { id } = await params;
    const tenantId = parseInt(id);

    if (isNaN(tenantId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const [tenant] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, tenantId))
      .limit(1);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    // Get owner info
    let owner = null;
    if (tenant.ownerId) {
      owner = await db.query.users.findFirst({
        where: eq(users.id, tenant.ownerId),
      });
    }

    // Get member count
    const [membersCount] = await db
      .select({ count: count() })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, tenantId));

    // Get subscription info
    const [subscription] = await db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        planId: subscriptions.planId,
        planName: subscriptionPlans.name,
        trialEndsAt: subscriptions.trialEndsAt,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      })
      .from(subscriptions)
      .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.organizationId, tenantId))
      .limit(1);

    return NextResponse.json({
      tenant,
      owner: owner ? { id: owner.id, name: owner.name, email: owner.email } : null,
      membersCount: membersCount?.count || 0,
      subscription,
    });
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return NextResponse.json({ error: "Error al obtener tenant" }, { status: 500 });
  }
}

// PATCH update tenant (status, plan, etc)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify platform admin access (only super_admin can modify tenants)
    const session = await requirePlatformAdmin();
    if (session.user.platformLevel !== "super_admin") {
      return NextResponse.json(
        { error: "Solo super admins pueden modificar tenants" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const tenantId = parseInt(id);
    const body = await request.json();

    if (isNaN(tenantId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const { action, ...updateData } = body;

    // Handle specific actions
    if (action === "suspend") {
      const [updated] = await db
        .update(organizations)
        .set({ status: "suspended", updatedAt: new Date() })
        .where(eq(organizations.id, tenantId))
        .returning();

      return NextResponse.json({ tenant: updated, message: "Tenant suspendido" });
    }

    if (action === "activate") {
      const [updated] = await db
        .update(organizations)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(organizations.id, tenantId))
        .returning();

      return NextResponse.json({ tenant: updated, message: "Tenant activado" });
    }

    if (action === "delete") {
      const [updated] = await db
        .update(organizations)
        .set({ status: "deleted", updatedAt: new Date() })
        .where(eq(organizations.id, tenantId))
        .returning();

      return NextResponse.json({ tenant: updated, message: "Tenant eliminado" });
    }

    // General update
    const [updated] = await db
      .update(organizations)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(organizations.id, tenantId))
      .returning();

    return NextResponse.json({ tenant: updated });
  } catch (error) {
    console.error("Error updating tenant:", error);
    return NextResponse.json({ error: "Error al actualizar tenant" }, { status: 500 });
  }
}

// DELETE tenant (hard delete - use with caution)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify platform admin access (only super_admin can delete tenants)
    const session = await requirePlatformAdmin();
    if (session.user.platformLevel !== "super_admin") {
      return NextResponse.json(
        { error: "Solo super admins pueden eliminar tenants" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const tenantId = parseInt(id);

    if (isNaN(tenantId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Soft delete by setting status to deleted
    const [deleted] = await db
      .update(organizations)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(eq(organizations.id, tenantId))
      .returning();

    return NextResponse.json({ tenant: deleted, message: "Tenant eliminado" });
  } catch (error) {
    console.error("Error deleting tenant:", error);
    return NextResponse.json({ error: "Error al eliminar tenant" }, { status: 500 });
  }
}
