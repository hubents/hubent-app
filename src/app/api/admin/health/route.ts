import { NextResponse } from "next/server";
import { db } from "@/db";
import { financialDocuments, roles, rolePermissions } from "@/db/schema";
import { sql, eq, count } from "drizzle-orm";
import { requirePermission } from "@/lib/session";

interface MigrationCheck {
  name: string;
  migration: string;
  ok: boolean;
  error?: string;
}

async function testQuery(label: string, migration: string, fn: () => Promise<void>): Promise<MigrationCheck> {
  try {
    await fn();
    return { name: label, migration, ok: true };
  } catch (err) {
    return { name: label, migration, ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function GET() {
  try {
    const session = await requirePermission("settings:read");

    if (session.user.platformLevel !== "super_admin" && session.role !== "owner") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admin only" } },
        { status: 403 }
      );
    }

    // 1. Test migration 0037 columns by running real queries
    const checks: MigrationCheck[] = await Promise.all([
      testQuery("financial_documents.source_document_id", "0037", async () => {
        await db.select({ cnt: count() }).from(financialDocuments)
          .where(sql`${financialDocuments.sourceDocumentId} IS NULL`);
      }),
      testQuery("financial_documents.source_org_id", "0037", async () => {
        await db.select({ cnt: count() }).from(financialDocuments)
          .where(sql`${financialDocuments.sourceOrgId} IS NULL`);
      }),
      testQuery("vendors.provider_org_id", "0037", async () => {
        await db.execute(sql`SELECT 1 FROM vendors WHERE provider_org_id IS NULL LIMIT 1`);
      }),
      testQuery("payment_records.source_payment_id", "0037", async () => {
        await db.execute(sql`SELECT 1 FROM payment_records WHERE source_payment_id IS NULL LIMIT 1`);
      }),
      testQuery("roles.event_scoped", "0034", async () => {
        await db.execute(sql`SELECT 1 FROM roles WHERE event_scoped IS NOT NULL LIMIT 1`);
      }),
    ]);

    // 2. Check roles have permissions
    const rolePerms = await db
      .select({
        slug: roles.slug,
        permCount: count(rolePermissions.permissionId),
      })
      .from(roles)
      .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .where(eq(roles.isSystem, true))
      .groupBy(roles.id, roles.slug)
      .orderBy(roles.slug);

    // 3. Finance document count (the query that broke production)
    let documentCount = 0;
    try {
      const [result] = await db.select({ cnt: count() }).from(financialDocuments)
        .where(sql`${financialDocuments.sourceDocumentId} IS NULL`);
      documentCount = result.cnt;
    } catch { /* already captured in checks */ }

    const failedChecks = checks.filter((c) => !c.ok);
    const allOk = failedChecks.length === 0;

    return NextResponse.json({
      success: true,
      status: allOk ? "healthy" : "degraded",
      data: {
        migrationChecks: checks,
        roles: rolePerms.map((r) => ({ slug: r.slug, permissionCount: r.permCount })),
        documentCount,
      },
      missingMigrations: [...new Set(failedChecks.map((c) => c.migration))],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Health check failed";
    return NextResponse.json(
      { success: false, error: { code: "HEALTH_CHECK_ERROR", message } },
      { status: 500 }
    );
  }
}
