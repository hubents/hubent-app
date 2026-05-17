import { NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/session";
import { db } from "@/db";
import { apiKeys, apiKeyLogs, organizations } from "@/db/schema";
import { eq, count, desc, and, lt, gte, like } from "drizzle-orm";
import { apiHandler, ok } from "@/lib/api-handler";

export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    await requirePlatformAdmin();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") ?? "50")));
    const offset = (page - 1) * limit;

    const statusFilter = searchParams.get("status"); // 2xx, 4xx, 5xx
    const methodFilter = searchParams.get("method");
    const search = searchParams.get("search");
    const orgId = searchParams.get("org_id");

    const conditions = [];

    if (statusFilter === "2xx") {
      conditions.push(and(gte(apiKeyLogs.statusCode, 200), lt(apiKeyLogs.statusCode, 300)));
    } else if (statusFilter === "4xx") {
      conditions.push(and(gte(apiKeyLogs.statusCode, 400), lt(apiKeyLogs.statusCode, 500)));
    } else if (statusFilter === "5xx") {
      conditions.push(gte(apiKeyLogs.statusCode, 500));
    }

    if (methodFilter) {
      conditions.push(eq(apiKeyLogs.method, methodFilter.toUpperCase()));
    }

    if (search) {
      conditions.push(like(apiKeyLogs.path, `%${search}%`));
    }

    if (orgId) {
      conditions.push(eq(apiKeys.organizationId, parseInt(orgId)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const logs = await db
      .select({
        id: apiKeyLogs.id,
        method: apiKeyLogs.method,
        path: apiKeyLogs.path,
        statusCode: apiKeyLogs.statusCode,
        responseTimeMs: apiKeyLogs.responseTimeMs,
        ipAddress: apiKeyLogs.ipAddress,
        requestId: apiKeyLogs.requestId,
        errorCode: apiKeyLogs.errorCode,
        createdAt: apiKeyLogs.createdAt,
        keyPrefix: apiKeys.keyPrefix,
        keyName: apiKeys.name,
        orgName: organizations.name,
        orgId: apiKeys.organizationId,
      })
      .from(apiKeyLogs)
      .innerJoin(apiKeys, eq(apiKeyLogs.apiKeyId, apiKeys.id))
      .innerJoin(organizations, eq(apiKeys.organizationId, organizations.id))
      .where(whereClause)
      .orderBy(desc(apiKeyLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: count() })
      .from(apiKeyLogs)
      .innerJoin(apiKeys, eq(apiKeyLogs.apiKeyId, apiKeys.id))
      .where(whereClause);

    return ok({
      logs,
      pagination: {
        page,
        limit,
        total: totalResult?.count ?? 0,
        totalPages: Math.ceil((totalResult?.count ?? 0) / limit),
      },
    });
  }, "GET /api/admin/api-platform/logs");
}
