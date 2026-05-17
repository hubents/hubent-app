import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { organizationFinanceSettings, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiHandler, ok } from "@/lib/api-handler";
import { TIMEZONE_DEFAULTS } from "@/lib/constants/locale";

// GET /api/finance/settings - Get organization finance settings
export async function GET() {
  return apiHandler(async () => {
    const session = await requirePermission("finance:read");
    const orgId = session.organizationId;

    // Read org locale settings for fallback / enrichment
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
      columns: { settings: true },
    });
    const orgLocale = org?.settings as { currency?: string; timezone?: string } | null;

    // Derive Intl locale from timezone (region), not from UI language
    const tzDefaults = TIMEZONE_DEFAULTS[orgLocale?.timezone ?? ""] ?? { intlLocale: "es-ES" };
    const orgIntlLocale = tzDefaults.intlLocale;

    const [settings] = await db
      .select()
      .from(organizationFinanceSettings)
      .where(eq(organizationFinanceSettings.organizationId, orgId))
      .limit(1);

    // If no settings exist, return defaults — using org locale currency as fallback
    if (!settings) {
      return ok({
        organizationId: orgId,
        defaultCurrency: orgLocale?.currency || "EUR",
        enabledCurrencies: ["EUR", "USD"],
        orgIntlLocale,
        quotePrefix: "PRES",
        invoicePrefix: "FAC",
        proformaPrefix: "PROF",
        deliveryNotePrefix: "ALB",
        creditNotePrefix: "FR",
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
      });
    }

    // Enrich existing settings with Intl locale derived from the org's timezone/region
    return ok({ ...settings, orgIntlLocale });
  }, "GET /api/finance/settings");
}

// PATCH /api/finance/settings - Update organization finance settings
export async function PATCH(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:manage");
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
      [result] = await db
        .update(organizationFinanceSettings)
        .set(updateData)
        .where(eq(organizationFinanceSettings.organizationId, orgId))
        .returning();
    } else {
      [result] = await db
        .insert(organizationFinanceSettings)
        .values({
          organizationId: orgId,
          ...updateData,
        })
        .returning();
    }

    return ok(result);
  }, "PATCH /api/finance/settings");
}
