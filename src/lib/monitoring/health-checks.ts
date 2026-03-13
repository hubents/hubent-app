// Health checks for all external services: DB, Stripe, R2, Pusher, Resend
// Returns status per service with latency measurements

import { logger } from "./logger";

export interface ServiceHealth {
  name: string;
  status: "operational" | "degraded" | "down";
  latencyMs: number;
  error?: string;
  checkedAt: string;
}

export interface HealthReport {
  overall: "operational" | "degraded" | "down";
  services: ServiceHealth[];
  checkedAt: string;
}

async function checkService(
  name: string,
  checkFn: () => Promise<void>
): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    await checkFn();
    const latencyMs = Date.now() - start;
    return {
      name,
      status: latencyMs > 5000 ? "degraded" : "operational",
      latencyMs,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      name,
      status: "down",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
      checkedAt: new Date().toISOString(),
    };
  }
}

async function checkDatabase(): Promise<void> {
  const { db } = await import("@/db");
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`SELECT 1`);
}

async function checkStripePlatform(): Promise<void> {
  const key = process.env.STRIPE_PLATFORM_SECRET_KEY;
  if (!key) throw new Error("STRIPE_PLATFORM_SECRET_KEY not configured");

  const response = await fetch("https://api.stripe.com/v1/balance", {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Stripe API returned ${response.status}: ${body.slice(0, 200)}`);
  }
}

async function checkR2(): Promise<void> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  if (!accountId || !accessKey) throw new Error("R2 credentials not configured");

  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) throw new Error("R2_PUBLIC_URL not configured");

  // Just check that the public URL is reachable
  const response = await fetch(publicUrl, { method: "HEAD" });
  // R2 returns 404 for root but that's fine — it means the endpoint is alive
  if (response.status >= 500) {
    throw new Error(`R2 returned ${response.status}`);
  }
}

async function checkPusher(): Promise<void> {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    throw new Error("Pusher credentials not configured");
  }

  // Check Pusher HTTP API health
  const response = await fetch(
    `https://api-${cluster}.pusher.com/apps/${appId}/channels`,
    {
      headers: {
        // Pusher REST API requires auth but we can check if endpoint responds
      },
    }
  );
  // 401 means the endpoint is alive but we didn't auth — that's fine
  if (response.status >= 500) {
    throw new Error(`Pusher returned ${response.status}`);
  }
}

async function checkResend(): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");

  const response = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok && response.status !== 401) {
    throw new Error(`Resend API returned ${response.status}`);
  }
}

export async function runHealthChecks(): Promise<HealthReport> {
  logger.info("Running health checks...");

  const services = await Promise.all([
    checkService("database", checkDatabase),
    checkService("stripe_platform", checkStripePlatform),
    checkService("r2_storage", checkR2),
    checkService("pusher", checkPusher),
    checkService("resend_email", checkResend),
  ]);

  const downServices = services.filter((s) => s.status === "down");
  const degradedServices = services.filter((s) => s.status === "degraded");

  let overall: HealthReport["overall"] = "operational";
  if (downServices.length > 0) {
    overall = "down";
  } else if (degradedServices.length > 0) {
    overall = "degraded";
  }

  const report: HealthReport = {
    overall,
    services,
    checkedAt: new Date().toISOString(),
  };

  if (overall !== "operational") {
    logger.warn("Health check detected issues", {
      meta: {
        overall,
        down: downServices.map((s) => s.name),
        degraded: degradedServices.map((s) => s.name),
      },
    });
  } else {
    logger.info("All health checks passed", {
      meta: { latencies: Object.fromEntries(services.map((s) => [s.name, s.latencyMs])) },
    });
  }

  return report;
}
