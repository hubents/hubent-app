import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { bankAccounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/finance/bank-accounts - List bank accounts
export async function GET() {
  try {
    const session = await requirePermission("finance:read");
    const orgId = session.organizationId;

    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.organizationId, orgId), eq(bankAccounts.isActive, true)))
      .orderBy(bankAccounts.name);

    return NextResponse.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch bank accounts";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/finance/bank-accounts - Create bank account
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("finance:manage");
    const orgId = session.organizationId;
    const body = await request.json();

    const { name, bankName, iban, swift, isDefault } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name is required" } },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      data: newAccount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create bank account";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// PATCH /api/finance/bank-accounts - Update bank account
export async function PATCH(request: NextRequest) {
  try {
    const session = await requirePermission("finance:manage");
    const orgId = session.organizationId;
    const body = await request.json();

    const { id, name, bankName, iban, swift, isDefault, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "ID is required" } },
        { status: 400 }
      );
    }

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

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Bank account not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update bank account";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/finance/bank-accounts - Delete (soft) bank account
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

    // Soft delete - just mark as inactive
    const [updated] = await db
      .update(bankAccounts)
      .set({ isActive: false })
      .where(and(eq(bankAccounts.id, parseInt(id, 10)), eq(bankAccounts.organizationId, orgId)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Bank account not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete bank account";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
