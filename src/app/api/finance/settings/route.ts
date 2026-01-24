import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { organizationFinanceSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/finance/settings - Get organization finance settings
export async function GET() {
  try {
    const session = await requireRole("viewer");
    const orgId = session.organizationId;

    const [settings] = await db
      .select()
      .from(organizationFinanceSettings)
      .where(eq(organizationFinanceSettings.organizationId, orgId))
      .limit(1);

    // If no settings exist, return defaults
    if (!settings) {
      return NextResponse.json({
        success: true,
        data: {
          organizationId: orgId,
          defaultCurrency: "EUR",
          enabledCurrencies: ["EUR", "USD"],
          quotePrefix: "PRES",
          invoicePrefix: "FAC",
          proformaPrefix: "PROF",
          deliveryNotePrefix: "ALB",
          creditNotePrefix: "ABONO",
          nextQuoteNumber: 1,
          nextInvoiceNumber: 1,
          nextProformaNumber: 1,
          nextDeliveryNoteNumber: 1,
          nextCreditNoteNumber: 1,
          stripeAccountId: null,
          stripeEnabled: false,
          enableCash: true,
          enableBankTransfer: true,
          enableStripe: false,
          defaultPaymentTerms: "30 días",
          defaultTermsAndConditions: null,
          quoteValidityDays: 30,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch settings";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// PATCH /api/finance/settings - Update organization finance settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRole("admin");
    const orgId = session.organizationId;
    const body = await request.json();

    // Check if settings exist
    const [existing] = await db
      .select({ id: organizationFinanceSettings.id })
      .from(organizationFinanceSettings)
      .where(eq(organizationFinanceSettings.organizationId, orgId))
      .limit(1);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Only update fields that are provided
    const allowedFields = [
      "defaultCurrency",
      "enabledCurrencies",
      "quotePrefix",
      "invoicePrefix",
      "proformaPrefix",
      "deliveryNotePrefix",
      "creditNotePrefix",
      "nextQuoteNumber",
      "nextInvoiceNumber",
      "nextProformaNumber",
      "nextDeliveryNoteNumber",
      "nextCreditNoteNumber",
      "stripeAccountId",
      "stripeEnabled",
      "enableCash",
      "enableBankTransfer",
      "enableStripe",
      "defaultPaymentTerms",
      "defaultTermsAndConditions",
      "quoteValidityDays",
      // Fiscal data
      "companyName",
      "taxId",
      "fiscalAddress",
      "fiscalCity",
      "fiscalPostalCode",
      "fiscalCountry",
      "fiscalEmail",
      "fiscalPhone",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    let result;
    if (existing) {
      // Update existing settings
      [result] = await db
        .update(organizationFinanceSettings)
        .set(updateData)
        .where(eq(organizationFinanceSettings.organizationId, orgId))
        .returning();
    } else {
      // Create new settings
      [result] = await db
        .insert(organizationFinanceSettings)
        .values({
          organizationId: orgId,
          ...updateData,
        })
        .returning();
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update settings";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 400 }
    );
  }
}
