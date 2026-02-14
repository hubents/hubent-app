import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { taxRates } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/finance/tax-rates - List tax rates
export async function GET() {
  try {
    const session = await requirePermission("finance:read");
    const orgId = session.organizationId;

    const rates = await db
      .select()
      .from(taxRates)
      .where(eq(taxRates.organizationId, orgId))
      .orderBy(taxRates.name);

    return NextResponse.json({
      success: true,
      data: rates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch tax rates";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/finance/tax-rates - Create tax rate
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("finance:manage");
    const orgId = session.organizationId;
    const body = await request.json();

    const { name, rate, isDefault } = body;

    if (!name || rate === undefined) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name and rate are required" } },
        { status: 400 }
      );
    }

    // If this is default, unset other defaults
    if (isDefault) {
      await db
        .update(taxRates)
        .set({ isDefault: false })
        .where(eq(taxRates.organizationId, orgId));
    }

    const [newRate] = await db
      .insert(taxRates)
      .values({
        organizationId: orgId,
        name,
        rate: rate.toString(),
        isDefault: isDefault || false,
        isActive: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newRate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create tax rate";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// PATCH /api/finance/tax-rates - Update tax rate
export async function PATCH(request: NextRequest) {
  try {
    const session = await requirePermission("finance:manage");
    const orgId = session.organizationId;
    const body = await request.json();

    const { id, name, rate, isDefault, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "ID is required" } },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db
        .update(taxRates)
        .set({ isDefault: false })
        .where(eq(taxRates.organizationId, orgId));
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (rate !== undefined) updateData.rate = rate.toString();
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db
      .update(taxRates)
      .set(updateData)
      .where(and(eq(taxRates.id, id), eq(taxRates.organizationId, orgId)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Tax rate not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update tax rate";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/finance/tax-rates - Delete tax rate
export async function DELETE(request: NextRequest) {
  try {
    const session = await requirePermission("finance:manage");
    const orgId = session.organizationId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "ID is required" } },
        { status: 400 }
      );
    }

    const [deleted] = await db
      .delete(taxRates)
      .where(and(eq(taxRates.id, parseInt(id, 10)), eq(taxRates.organizationId, orgId)))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Tax rate not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deleted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete tax rate";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
