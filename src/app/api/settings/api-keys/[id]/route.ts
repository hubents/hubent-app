import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getApiKey, updateApiKey, revokeApiKey, getApiKeyRecentLogs } from "@/lib/api/api-keys";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("settings:update");
    const { id } = await params;
    const keyId = parseInt(id, 10);

    const key = await getApiKey(keyId, session.organizationId);
    if (!key) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "API key not found" } }, { status: 404 });
    }

    const logs = await getApiKeyRecentLogs(keyId, 20);

    return NextResponse.json({ success: true, data: { ...key, recent_logs: logs } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch API key";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ success: false, error: { code: "FETCH_ERROR", message } }, { status });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
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
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "API key not found" } }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update API key";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ success: false, error: { code: "UPDATE_ERROR", message } }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("settings:update");
    const { id } = await params;
    const keyId = parseInt(id, 10);

    const revoked = await revokeApiKey(keyId, session.organizationId, session.user.userId);
    if (!revoked) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "API key not found" } }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { id: keyId, revoked: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revoke API key";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ success: false, error: { code: "REVOKE_ERROR", message } }, { status });
  }
}
