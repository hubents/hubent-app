import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { createApiKeyRecord, listApiKeys, getApiUsageStats, countApiKeys } from "@/lib/api/api-keys";
import { ALL_SCOPES, PROVIDER_ALLOWED_SCOPES } from "@/lib/api/api-auth";
import { getApiKeyLimit } from "@/lib/api/api-feature-flags";
import { apiHandler, ok, created, badRequest, forbidden } from "@/lib/api-handler";
import { z } from "zod";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1),
  environment: z.enum(["live", "test"]).optional(),
  rate_limit: z.number().int().min(10).max(10000).optional(),
  expires_at: z.string().datetime().optional(),
});

export async function GET() {
  return apiHandler(async () => {
    const session = await requirePermission("settings:update");
    const keys = await listApiKeys(session.organizationId);
    const stats = await getApiUsageStats(session.organizationId);

    const isProvider = session.orgType === "provider";
    const availableScopes = isProvider ? PROVIDER_ALLOWED_SCOPES : ALL_SCOPES;

    return ok({ keys, stats, available_scopes: availableScopes, org_type: session.orgType });
  }, "GET /api/settings/api-keys");
}

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("settings:update");
    const body = await request.json();
    const parsed = createKeySchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const d = parsed.data;

    // Check API key limit per plan
    const currentCount = await countApiKeys(session.organizationId);
    const planSlug = session.plan?.slug || "starter";
    const maxKeys = getApiKeyLimit(planSlug);
    if (currentCount >= maxKeys) {
      return forbidden(`Your plan (${planSlug}) allows a maximum of ${maxKeys} API keys. You currently have ${currentCount} active keys.`);
    }

    // Validate scopes against ALL_SCOPES
    const invalidScopes = d.scopes.filter((s) => !ALL_SCOPES.includes(s as typeof ALL_SCOPES[number]));
    if (invalidScopes.length > 0) {
      return badRequest(`Invalid scopes: ${invalidScopes.join(", ")}`, "INVALID_SCOPES");
    }

    // Enforce provider scope restrictions
    const isProvider = session.orgType === "provider";
    if (isProvider) {
      const forbiddenScopes = d.scopes.filter((s) => !PROVIDER_ALLOWED_SCOPES.includes(s as typeof PROVIDER_ALLOWED_SCOPES[number]));
      if (forbiddenScopes.length > 0) {
        return forbidden(`Provider accounts cannot use scopes: ${forbiddenScopes.join(", ")}. Allowed: ${PROVIDER_ALLOWED_SCOPES.join(", ")}`);
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

    return created({ ...apiKey, raw_key: rawKey });
  }, "POST /api/settings/api-keys");
}
