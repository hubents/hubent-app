import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredIdempotencyKeys } from "@/lib/api/api-idempotency";
import { db } from "@/db";
import { apiKeyLogs } from "@/db/schema";
import { lt, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Allow in dev
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    idempotencyKeysDeleted: 0,
    apiLogsDeleted: 0,
    errors: [] as string[],
  };

  try {
    // 1. Cleanup expired idempotency keys (24h TTL)
    results.idempotencyKeysDeleted = await cleanupExpiredIdempotencyKeys();
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    results.errors.push(`idempotency_cleanup: ${msg}`);
  }

  try {
    // 2. Cleanup old API logs (> 90 days)
    const deleted = await db
      .delete(apiKeyLogs)
      .where(lt(apiKeyLogs.createdAt, sql`now() - interval '90 days'`))
      .returning({ id: apiKeyLogs.id });
    results.apiLogsDeleted = deleted.length;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    results.errors.push(`api_logs_cleanup: ${msg}`);
  }

  console.log("[CRON] API cleanup results:", results);

  return NextResponse.json({
    success: results.errors.length === 0,
    data: results,
  });
}
