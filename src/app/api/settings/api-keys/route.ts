import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { createApiKeyRecord, listApiKeys, getApiUsageStats, countApiKeys } from "@/lib/api/api-keys";
import { ALL_SCOPES, PROVIDER_ALLOWED_SCOPES } from "@/lib/api/api-auth";
import { getApiKeyLimit } from "@/lib/api/api-feature-flags";
import { z } from "zod";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1),
  environment: z.enum(["live", "test"]).optional(),
  rate_limit: z.number().int().min(10).max(10000).optional(),
  expires_at: z.string().datetime().optional(),
});

export async function GET() {
  try {
    const session = await requirePermission("settings:update");
    const keys = await listApiKeys(session.organizationId);
    const stats = await getApiUsageStats(session.organizationId);

    const isProvider = session.orgType === "provider";
    const availableScopes = isProvider ? PROVIDER_ALLOWED_SCOPES : ALL_SCOPES;

    return NextResponse.json({
      success: true,
      data: { keys, stats, available_scopes: availableScopes, org_type: session.orgType },
    });
  } catch (error) {
    console.error("[API Keys GET]", error);
    const message = error instanceof Error ? error.message : "Failed to fetch API keys";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ success: false, error: { code: "FETCH_ERROR", message } }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("settings:update");
    const body = await request.json();
    const parsed = createKeySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const d = parsed.data;

    // Check API key limit per plan
    const currentCount = await countApiKeys(session.organizationId);
    const planSlug = session.plan?.slug || "starter";
    const maxKeys = getApiKeyLimit(planSlug);
    if (currentCount >= maxKeys) {
      return NextResponse.json(
        { success: false, error: { code: "LIMIT_REACHED", message: `Your plan (${planSlug}) allows a maximum of ${maxKeys} API keys. You currently have ${currentCount} active keys.` } },
        { status: 403 }
      );
    }

    // Validate scopes against ALL_SCOPES
    const invalidScopes = d.scopes.filter((s) => !ALL_SCOPES.includes(s as typeof ALL_SCOPES[number]));
    if (invalidScopes.length > 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_SCOPES", message: `Invalid scopes: ${invalidScopes.join(", ")}` } },
        { status: 400 }
      );
    }

    // Enforce provider scope restrictions
    const isProvider = session.orgType === "provider";
    if (isProvider) {
      const forbiddenScopes = d.scopes.filter((s) => !PROVIDER_ALLOWED_SCOPES.includes(s as typeof PROVIDER_ALLOWED_SCOPES[number]));
      if (forbiddenScopes.length > 0) {
        return NextResponse.json(
          { success: false, error: { code: "SCOPE_NOT_ALLOWED", message: `Provider accounts cannot use scopes: ${forbiddenScopes.join(", ")}. Allowed: ${PROVIDER_ALLOWED_SCOPES.join(", ")}` } },
          { status: 403 }
        );
      }
    }

    const { apiKey, rawKey } = await createApiKeyRecord({
      organizationId: session.organizationId,
      name: d.name,
      scopes: d.scopes as typeof ALL_SCOPES[number][],
      environment: d.environment,
      rateLimit: d.rate_limit,
      expiresAt: d.expires_at ? new Date(d.expires_at) : null,
      createdBy: session.user.userId,
    });

    return NextResponse.json({
      success: true,
      data: { ...apiKey, raw_key: rawKey },
      message: "API key created. Copy the raw key now — it won't be shown again.",
    }, { status: 201 });
  } catch (error) {
    console.error("[API Keys POST]", error);
    const message = error instanceof Error ? error.message : "Failed to create API key";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ success: false, error: { code: "CREATE_ERROR", message } }, { status });
  }
}
