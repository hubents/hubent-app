import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { financialDocuments, paymentRecords, organizationFinanceSettings } from "@/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";

export async function GET() {
  try {
    const session = await requireRole("viewer");
    const orgId = session.organizationId;

    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get finance settings for currency
    const [settings] = await db
      .select({ defaultCurrency: organizationFinanceSettings.defaultCurrency })
      .from(organizationFinanceSettings)
      .where(eq(organizationFinanceSettings.organizationId, orgId))
      .limit(1);

    const currency = settings?.defaultCurrency || "EUR";

    // Calculate total income (payments received this month)
    const [incomeResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${paymentRecords.amount}), 0)`,
      })
      .from(paymentRecords)
      .where(
        and(
          eq(paymentRecords.organizationId, orgId),
          eq(paymentRecords.direction, "incoming"),
          gte(paymentRecords.paymentDate, startOfMonth),
          lte(paymentRecords.paymentDate, endOfMonth)
        )
      );

    // Calculate total expenses (payments made this month)
    const [expensesResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${paymentRecords.amount}), 0)`,
      })
      .from(paymentRecords)
      .where(
        and(
          eq(paymentRecords.organizationId, orgId),
          eq(paymentRecords.direction, "outgoing"),
          gte(paymentRecords.paymentDate, startOfMonth),
          lte(paymentRecords.paymentDate, endOfMonth)
        )
      );

    // Calculate pending invoices (sent but not paid)
    const [pendingResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${financialDocuments.total}), 0)`,
      })
      .from(financialDocuments)
      .where(
        and(
          eq(financialDocuments.organizationId, orgId),
          eq(financialDocuments.type, "invoice"),
          eq(financialDocuments.status, "sent")
        )
      );

    // Calculate overdue invoices
    const [overdueResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${financialDocuments.total}), 0)`,
      })
      .from(financialDocuments)
      .where(
        and(
          eq(financialDocuments.organizationId, orgId),
          eq(financialDocuments.type, "invoice"),
          eq(financialDocuments.status, "sent"),
          lte(financialDocuments.dueDate, now)
        )
      );

    // Calculate pending payments to vendors
    const [pendingPaymentsResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${financialDocuments.total}), 0)`,
      })
      .from(financialDocuments)
      .where(
        and(
          eq(financialDocuments.organizationId, orgId),
          eq(financialDocuments.type, "invoice"),
          eq(financialDocuments.direction, "incoming"),
          eq(financialDocuments.status, "sent")
        )
      );

    const totalIncome = parseFloat(incomeResult?.total || "0");
    const totalExpenses = parseFloat(expensesResult?.total || "0");

    return NextResponse.json({
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        pendingInvoices: parseFloat(pendingResult?.total || "0"),
        pendingPayments: parseFloat(pendingPaymentsResult?.total || "0"),
        overdueInvoices: parseFloat(overdueResult?.total || "0"),
        currency,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch dashboard data";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
