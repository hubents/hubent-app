import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { bankAccounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, ok, created, notFound, badRequest } from "@/lib/api-handler";

// GET /api/finance/bank-accounts - List bank accounts
export async function GET() {
  return apiHandler(async () => {
    const session = await requirePermission("finance:read");
    const orgId = session.organizationId;

    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.organizationId, orgId), eq(bankAccounts.isActive, true)))
      .orderBy(bankAccounts.name);

    return ok(accounts);
  }, "GET /api/finance/bank-accounts");
}

// POST /api/finance/bank-accounts - Create bank account
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:manage");
    const orgId = session.organizationId;
    const body = await request.json();

    const { name, bankName, iban, swift, isDefault } = body;

    if (!name) return badRequest("Name is required");

    // If this is default, unset other defaults
    if (isDefault) {
      await db
        .update(bankAccounts)
        .set({ isDefault: false })
        .where(eq(bankAccounts.organizationId, orgId));
    }

    const [newAccount] = await db
      .insert(bankAccounts)
      .values({
        organizationId: orgId,
        name,
        bankName: bankName || null,
        iban: iban || null,
        swift: swift || null,
        isDefault: isDefault || false,
        isActive: true,
      })
      .returning();

    return created(newAccount);
  }, "POST /api/finance/bank-accounts");
}

// PATCH /api/finance/bank-accounts - Update bank account
export async function PATCH(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:manage");
    const orgId = session.organizationId;
    const body = await request.json();

    const { id, name, bankName, iban, swift, isDefault, isActive } = body;

    if (!id) return badRequest("ID is required");

    // If setting as default, unset other defaults
    if (isDefault) {
      await db
        .update(bankAccounts)
        .set({ isDefault: false })
        .where(eq(bankAccounts.organizationId, orgId));
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (bankName !== undefined) updateData.bankName = bankName;
    if (iban !== undefined) updateData.iban = iban;
    if (swift !== undefined) updateData.swift = swift;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db
      .update(bankAccounts)
      .set(updateData)
      .where(and(eq(bankAccounts.id, id), eq(bankAccounts.organizationId, orgId)))
      .returning();

    if (!updated) return notFound("Bank account not found");

    return ok(updated);
  }, "PATCH /api/finance/bank-accounts");
}

// DELETE /api/finance/bank-accounts - Soft delete bank account
export async function DELETE(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:manage");
    const orgId = session.organizationId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return badRequest("ID is required");

    // Soft delete - just mark as inactive
    const [updated] = await db
      .update(bankAccounts)
      .set({ isActive: false })
      .where(and(eq(bankAccounts.id, parseInt(id, 10)), eq(bankAccounts.organizationId, orgId)))
      .returning();

    if (!updated) return notFound("Bank account not found");

    return ok(updated);
  }, "DELETE /api/finance/bank-accounts");
}
