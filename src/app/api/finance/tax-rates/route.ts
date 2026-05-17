import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { taxRates } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, ok, created, notFound, badRequest } from "@/lib/api-handler";

// GET /api/finance/tax-rates - List tax rates
export async function GET() {
  return apiHandler(async () => {
    const session = await requirePermission("finance:read");
    const orgId = session.organizationId;

    const rates = await db
      .select()
      .from(taxRates)
      .where(eq(taxRates.organizationId, orgId))
      .orderBy(taxRates.name);

    return ok(rates);
  }, "GET /api/finance/tax-rates");
}

// POST /api/finance/tax-rates - Create tax rate
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:manage");
    const orgId = session.organizationId;
    const body = await request.json();

    const { name, rate, isDefault } = body;

    if (!name || rate === undefined) {
      return badRequest("Name and rate are required");
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

    return created(newRate);
  }, "POST /api/finance/tax-rates");
}

// PATCH /api/finance/tax-rates - Update tax rate
export async function PATCH(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:manage");
    const orgId = session.organizationId;
    const body = await request.json();

    const { id, name, rate, isDefault, isActive } = body;

    if (!id) return badRequest("ID is required");

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

    if (!updated) return notFound("Tax rate not found");

    return ok(updated);
  }, "PATCH /api/finance/tax-rates");
}

// DELETE /api/finance/tax-rates - Delete tax rate
export async function DELETE(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:manage");
    const orgId = session.organizationId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return badRequest("ID is required");

    const [deleted] = await db
      .delete(taxRates)
      .where(and(eq(taxRates.id, parseInt(id, 10)), eq(taxRates.organizationId, orgId)))
      .returning();

    if (!deleted) return notFound("Tax rate not found");

    return ok(deleted);
  }, "DELETE /api/finance/tax-rates");
}
