import { requirePlatformAdmin } from "@/lib/session";
import { runHealthChecks } from "@/lib/monitoring/health-checks";
import { logger } from "@/lib/monitoring/logger";
import { apiHandler, ok } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

const REQUIRED_ENV_VARS: {
  key: string;
  fallback?: string;
  label: string;
  category: string;
}[] = [
  { key: "DATABASE_URL", label: "Database URL", category: "core" },
  { key: "AUTH_SECRET", fallback: "NEXTAUTH_SECRET", label: "Auth Secret", category: "core" },
  { key: "STRIPE_PLATFORM_SECRET_KEY", label: "Stripe Secret Key", category: "payments" },
  { key: "NEXT_PUBLIC_STRIPE_PLATFORM_KEY", label: "Stripe Public Key", category: "payments" },
  { key: "STRIPE_PLATFORM_WEBHOOK_SECRET", label: "Stripe Webhook Secret", category: "payments" },
  { key: "RESEND_API_KEY", label: "Resend API Key", category: "email" },
  { key: "R2_ACCOUNT_ID", label: "R2 Account ID", category: "storage" },
  { key: "R2_ACCESS_KEY_ID", label: "R2 Access Key", category: "storage" },
  { key: "R2_SECRET_ACCESS_KEY", label: "R2 Secret Key", category: "storage" },
  { key: "R2_BUCKET_NAME", label: "R2 Bucket Name", category: "storage" },
  { key: "R2_PUBLIC_URL", label: "R2 Public URL", category: "storage" },
  { key: "PUSHER_APP_ID", label: "Pusher App ID", category: "realtime" },
  { key: "PUSHER_KEY", label: "Pusher Key", category: "realtime" },
  { key: "PUSHER_SECRET", label: "Pusher Secret", category: "realtime" },
  { key: "PUSHER_CLUSTER", label: "Pusher Cluster", category: "realtime" },
  { key: "COMPOSIO_API_KEY", label: "Composio API Key", category: "integrations" },
  { key: "CRON_SECRET", label: "Cron Secret", category: "system" },
];

export async function GET() {
  return apiHandler(async () => {
    await requirePlatformAdmin();

    const [health, recentErrors] = await Promise.all([
      runHealthChecks(),
      Promise.resolve(logger.getErrorLogs(20)),
    ]);

    const envStatus = REQUIRED_ENV_VARS.map((v) => ({
      key: v.key,
      label: v.label,
      category: v.category,
      configured: !!(process.env[v.key] || (v.fallback && process.env[v.fallback])),
    }));

    const configuredCount = envStatus.filter((e) => e.configured).length;

    return ok({
      health,
      envStatus,
      envSummary: {
        total: envStatus.length,
        configured: configuredCount,
        missing: envStatus.length - configuredCount,
      },
      recentErrors: recentErrors.map((e) => ({
        timestamp: e.timestamp,
        level: e.level,
        message: e.message,
        path: e.context.path,
        method: e.context.method,
        statusCode: e.context.statusCode,
      })),
    });
  }, "GET /api/admin/status");
}
