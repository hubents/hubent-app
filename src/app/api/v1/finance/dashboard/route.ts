import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { financialDocuments, paymentRecords } from "@/db/schema";
import { eq, and, sql, count } from "drizzle-orm";

export const GET = withApiAuth(
  async (_request: NextRequest, { session }) => {
    const orgId = session.organizationId;

    // Total by document type
    const docStats = await db
      .select({
        type: financialDocuments.type,
        count: count(),
        total: sql<string>`COALESCE(SUM(CAST(${financialDocuments.total} AS NUMERIC)), 0)`,
      })
      .from(financialDocuments)
      .where(eq(financialDocuments.organizationId, orgId))
      .groupBy(financialDocuments.type);

    // Total paid
    const [paidStats] = await db
      .select({
        totalIncoming: sql<string>`COALESCE(SUM(CASE WHEN ${paymentRecords.direction} = 'incoming' THEN CAST(${paymentRecords.amount} AS NUMERIC) ELSE 0 END), 0)`,
        totalOutgoing: sql<string>`COALESCE(SUM(CASE WHEN ${paymentRecords.direction} = 'outgoing' THEN CAST(${paymentRecords.amount} AS NUMERIC) ELSE 0 END), 0)`,
        count: count(),
      })
      .from(paymentRecords)
      .where(eq(paymentRecords.organizationId, orgId));

    // Pending invoices
    const [pendingInvoices] = await db
      .select({
        count: count(),
        total: sql<string>`COALESCE(SUM(CAST(${financialDocuments.total} AS NUMERIC)), 0)`,
      })
      .from(financialDocuments)
      .where(
        and(
          eq(financialDocuments.organizationId, orgId),
          eq(financialDocuments.type, "invoice"),
          sql`${financialDocuments.status} IN ('sent', 'draft', 'approved')`
        )
      );

    const byType: Record<string, { count: number; total: string }> = {};
    for (const row of docStats) {
      if (row.type) byType[row.type] = { count: row.count, total: row.total };
    }

    return {
      data: {
        object: "finance_dashboard",
        documents_by_type: byType,
        payments: {
          total_incoming: paidStats?.totalIncoming ?? "0",
          total_outgoing: paidStats?.totalOutgoing ?? "0",
          count: paidStats?.count ?? 0,
        },
        pending_invoices: {
          count: pendingInvoices?.count ?? 0,
          total: pendingInvoices?.total ?? "0",
        },
      },
    };
  },
  { scope: "finance:read" }
);
