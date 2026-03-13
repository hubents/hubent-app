import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/session";
import { logger } from "@/lib/monitoring/logger";
import { getReportStats } from "@/lib/monitoring/error-reporter";
import { runHealthChecks } from "@/lib/monitoring/health-checks";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformAdmin();

    const [health, logStats, reportStats] = await Promise.all([
      runHealthChecks(),
      Promise.resolve(logger.getStats()),
      Promise.resolve(getReportStats()),
    ]);

    const recentErrors = logger.getErrorLogs(20);

    return NextResponse.json({
      success: true,
      data: {
        health,
        logs: {
          stats: logStats,
          recentErrors: recentErrors.map((e) => ({
            timestamp: e.timestamp,
            level: e.level,
            message: e.message,
            path: e.context.path,
            method: e.context.method,
            statusCode: e.context.statusCode,
            userId: e.context.userId,
            orgId: e.context.orgId,
            durationMs: e.context.durationMs,
          })),
        },
        tickets: reportStats,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get monitoring data";
    const status = message.includes("Unauthorized") || message.includes("Platform admin") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
