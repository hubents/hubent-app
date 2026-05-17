import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { getApiKey, updateApiKey, revokeApiKey, getApiKeyRecentLogs } from "@/lib/api/api-keys";
import { apiHandler, ok, notFound } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("settings:update");
    const { id } = await params;
    const keyId = parseInt(id, 10);

    const key = await getApiKey(keyId, session.organizationId);
    if (!key) {
      return notFound("API key not found");
    }

    const logs = await getApiKeyRecentLogs(keyId, 20);

    return ok({ ...key, recent_logs: logs });
  }, "GET /api/settings/api-keys/[id]");
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("settings:update");
    const { id } = await params;
    const keyId = parseInt(id, 10);

    const body = await request.json();
    const updated = await updateApiKey(keyId, session.organizationId, {
      name: body.name,
      scopes: body.scopes,
      rateLimit: body.rate_limit,
      expiresAt: body.expires_at ? new Date(body.expires_at) : body.expires_at,
    });

    if (!updated) {
      return notFound("API key not found");
    }

    return ok(updated);
  }, "PATCH /api/settings/api-keys/[id]");
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("settings:update");
    const { id } = await params;
    const keyId = parseInt(id, 10);

    const revoked = await revokeApiKey(keyId, session.organizationId, session.user.userId);
    if (!revoked) {
      return notFound("API key not found");
    }

    return ok({ id: keyId, revoked: true });
  }, "DELETE /api/settings/api-keys/[id]");
}
