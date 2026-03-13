import { NextRequest, NextResponse } from "next/server";
import { runHealthChecks } from "@/lib/monitoring/health-checks";
import { reportHealthCheckFailure } from "@/lib/monitoring/error-reporter";
import { logger } from "@/lib/monitoring/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await runHealthChecks();

    // Auto-create tickets for any down services
    const downServices = report.services.filter((s) => s.status === "down");
    const ticketIds: string[] = [];

    for (const service of downServices) {
      const ticketId = await reportHealthCheckFailure(
        service.name,
        service.error || "Service is down",
        { latencyMs: service.latencyMs, checkedAt: service.checkedAt }
      );
      if (ticketId) ticketIds.push(ticketId);
    }

    if (downServices.length > 0) {
      logger.critical(`Health check: ${downServices.length} service(s) down`, {
        meta: {
          down: downServices.map((s) => s.name),
          ticketsCreated: ticketIds.length,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...report,
        ticketsCreated: ticketIds,
      },
    });
  } catch (error) {
    logger.error("Health check cron failed", { error });
    return NextResponse.json(
      { success: false, error: "Health check failed" },
      { status: 500 }
    );
  }
}
