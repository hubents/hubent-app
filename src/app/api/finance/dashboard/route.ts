import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { financialDocuments, paymentRecords, organizationFinanceSettings, contacts } from "@/db/schema";
import { eq, and, sql, gte, lte, desc, isNotNull } from "drizzle-orm";

export async function GET() {
  try {
    const session = await requireRole("viewer");
    const orgId = session.organizationId;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    // Previous month for comparison
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

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

    // Previous month income for comparison
    const [prevIncomeResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${paymentRecords.amount}), 0)`,
      })
      .from(paymentRecords)
      .where(
        and(
          eq(paymentRecords.organizationId, orgId),
          eq(paymentRecords.direction, "incoming"),
          gte(paymentRecords.paymentDate, startOfPrevMonth),
          lte(paymentRecords.paymentDate, endOfPrevMonth)
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

    // Previous month expenses
    const [prevExpensesResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${paymentRecords.amount}), 0)`,
      })
      .from(paymentRecords)
      .where(
        and(
          eq(paymentRecords.organizationId, orgId),
          eq(paymentRecords.direction, "outgoing"),
          gte(paymentRecords.paymentDate, startOfPrevMonth),
          lte(paymentRecords.paymentDate, endOfPrevMonth)
        )
      );

    // Calculate pending invoices (sent but not paid)
    const [pendingResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${financialDocuments.total}), 0)`,
        count: sql<string>`COUNT(*)`,
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
        count: sql<string>`COUNT(*)`,
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

    // ============================================
    // AGING ANALYSIS (Accounts Receivable)
    // ============================================
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // 0-30 days overdue
    const [aging0to30] = await db
      .select({ total: sql<string>`COALESCE(SUM(${financialDocuments.total}), 0)` })
      .from(financialDocuments)
      .where(
        and(
          eq(financialDocuments.organizationId, orgId),
          eq(financialDocuments.type, "invoice"),
          eq(financialDocuments.status, "sent"),
          lte(financialDocuments.dueDate, now),
          gte(financialDocuments.dueDate, thirtyDaysAgo)
        )
      );

    // 31-60 days overdue
    const [aging31to60] = await db
      .select({ total: sql<string>`COALESCE(SUM(${financialDocuments.total}), 0)` })
      .from(financialDocuments)
      .where(
        and(
          eq(financialDocuments.organizationId, orgId),
          eq(financialDocuments.type, "invoice"),
          eq(financialDocuments.status, "sent"),
          lte(financialDocuments.dueDate, thirtyDaysAgo),
          gte(financialDocuments.dueDate, sixtyDaysAgo)
        )
      );

    // 61-90 days overdue
    const [aging61to90] = await db
      .select({ total: sql<string>`COALESCE(SUM(${financialDocuments.total}), 0)` })
      .from(financialDocuments)
      .where(
        and(
          eq(financialDocuments.organizationId, orgId),
          eq(financialDocuments.type, "invoice"),
          eq(financialDocuments.status, "sent"),
          lte(financialDocuments.dueDate, sixtyDaysAgo),
          gte(financialDocuments.dueDate, ninetyDaysAgo)
        )
      );

    // >90 days overdue
    const [agingOver90] = await db
      .select({ total: sql<string>`COALESCE(SUM(${financialDocuments.total}), 0)` })
      .from(financialDocuments)
      .where(
        and(
          eq(financialDocuments.organizationId, orgId),
          eq(financialDocuments.type, "invoice"),
          eq(financialDocuments.status, "sent"),
          lte(financialDocuments.dueDate, ninetyDaysAgo)
        )
      );

    // ============================================
    // CASH FLOW PROJECTION (Next 90 days)
    // ============================================
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const next60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Expected income (invoices due in next periods)
    const [cashFlow30] = await db
      .select({ total: sql<string>`COALESCE(SUM(${financialDocuments.total}), 0)` })
      .from(financialDocuments)
      .where(
        and(
          eq(financialDocuments.organizationId, orgId),
          eq(financialDocuments.type, "invoice"),
          eq(financialDocuments.status, "sent"),
          gte(financialDocuments.dueDate, now),
          lte(financialDocuments.dueDate, next30Days)
        )
      );

    const [cashFlow60] = await db
      .select({ total: sql<string>`COALESCE(SUM(${financialDocuments.total}), 0)` })
      .from(financialDocuments)
      .where(
        and(
          eq(financialDocuments.organizationId, orgId),
          eq(financialDocuments.type, "invoice"),
          eq(financialDocuments.status, "sent"),
          gte(financialDocuments.dueDate, next30Days),
          lte(financialDocuments.dueDate, next60Days)
        )
      );

    const [cashFlow90] = await db
      .select({ total: sql<string>`COALESCE(SUM(${financialDocuments.total}), 0)` })
      .from(financialDocuments)
      .where(
        and(
          eq(financialDocuments.organizationId, orgId),
          eq(financialDocuments.type, "invoice"),
          eq(financialDocuments.status, "sent"),
          gte(financialDocuments.dueDate, next60Days),
          lte(financialDocuments.dueDate, next90Days)
        )
      );

    // ============================================
    // TOP 5 CLIENTS BY REVENUE (Last 12 months)
    // ============================================
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    
    const topClients = await db
      .select({
        contactId: financialDocuments.contactId,
        contactName: contacts.name,
        total: sql<string>`COALESCE(SUM(${financialDocuments.total}), 0)`,
        count: sql<string>`COUNT(*)`,
      })
      .from(financialDocuments)
      .leftJoin(contacts, eq(financialDocuments.contactId, contacts.id))
      .where(
        and(
          eq(financialDocuments.organizationId, orgId),
          eq(financialDocuments.type, "invoice"),
          eq(financialDocuments.status, "paid"),
          isNotNull(financialDocuments.contactId),
          gte(financialDocuments.paidAt, oneYearAgo)
        )
      )
      .groupBy(financialDocuments.contactId, contacts.name)
      .orderBy(desc(sql`SUM(${financialDocuments.total})`))
      .limit(5);

    // ============================================
    // MONTHLY REVENUE (Last 6 months)
    // ============================================
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      const [monthResult] = await db
        .select({
          income: sql<string>`COALESCE(SUM(CASE WHEN ${paymentRecords.direction} = 'incoming' THEN ${paymentRecords.amount} ELSE 0 END), 0)`,
          expenses: sql<string>`COALESCE(SUM(CASE WHEN ${paymentRecords.direction} = 'outgoing' THEN ${paymentRecords.amount} ELSE 0 END), 0)`,
        })
        .from(paymentRecords)
        .where(
          and(
            eq(paymentRecords.organizationId, orgId),
            gte(paymentRecords.paymentDate, monthStart),
            lte(paymentRecords.paymentDate, monthEnd)
          )
        );

      monthlyRevenue.push({
        month: monthStart.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
        income: parseFloat(monthResult?.income || "0"),
        expenses: parseFloat(monthResult?.expenses || "0"),
      });
    }

    const totalIncome = parseFloat(incomeResult?.total || "0");
    const totalExpenses = parseFloat(expensesResult?.total || "0");
    const prevIncome = parseFloat(prevIncomeResult?.total || "0");
    const prevExpenses = parseFloat(prevExpensesResult?.total || "0");

    return NextResponse.json({
      success: true,
      data: {
        // Basic stats
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        pendingInvoices: parseFloat(pendingResult?.total || "0"),
        pendingInvoicesCount: parseInt(pendingResult?.count || "0"),
        pendingPayments: parseFloat(pendingPaymentsResult?.total || "0"),
        overdueInvoices: parseFloat(overdueResult?.total || "0"),
        overdueInvoicesCount: parseInt(overdueResult?.count || "0"),
        currency,
        
        // Month-over-month comparison
        incomeChange: prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0,
        expensesChange: prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0,
        
        // Aging analysis
        aging: {
          current: parseFloat(pendingResult?.total || "0") - parseFloat(overdueResult?.total || "0"),
          days0to30: parseFloat(aging0to30?.total || "0"),
          days31to60: parseFloat(aging31to60?.total || "0"),
          days61to90: parseFloat(aging61to90?.total || "0"),
          over90: parseFloat(agingOver90?.total || "0"),
        },
        
        // Cash flow projection
        cashFlow: {
          next30Days: parseFloat(cashFlow30?.total || "0"),
          next60Days: parseFloat(cashFlow60?.total || "0"),
          next90Days: parseFloat(cashFlow90?.total || "0"),
        },
        
        // Top clients
        topClients: topClients.map(c => ({
          id: c.contactId,
          name: c.contactName || "Sin nombre",
          total: parseFloat(c.total || "0"),
          invoiceCount: parseInt(c.count || "0"),
        })),
        
        // Monthly trend
        monthlyRevenue,
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
