import { db } from "@/db";
import { apiKeys, apiKeyLogs } from "@/db/schema";
import { eq, and, desc, sql, gt, lt, count } from "drizzle-orm";
import { generateApiKey } from "./api-utils";
import type { ApiScope } from "./api-auth";

// ============================================
// Types
// ============================================

export interface CreateApiKeyInput {
  organizationId: number;
  name: string;
  scopes: ApiScope[];
  environment?: "live" | "test";
  rateLimit?: number;
  expiresAt?: Date | null;
  createdBy?: string;
}

export interface UpdateApiKeyInput {
  name?: string;
  scopes?: ApiScope[];
  rateLimit?: number;
  expiresAt?: Date | null;
}

export interface ApiKeyListItem {
  id: number;
  name: string;
  keyPrefix: string;
  scopes: string[];
  environment: string;
  rateLimit: number | null;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  isActive: boolean;
  createdAt: Date | null;
  revokedAt: Date | null;
}

// ============================================
// Create API Key
// ============================================

export async function createApiKeyRecord(input: CreateApiKeyInput): Promise<{ apiKey: ApiKeyListItem; rawKey: string }> {
  const env = input.environment || "live";
  const { raw, hash, prefix } = generateApiKey(env);

  const [record] = await db
    .insert(apiKeys)
    .values({
      organizationId: input.organizationId,
      name: input.name,
      keyHash: hash,
      keyPrefix: prefix,
      scopes: input.scopes,
      environment: env,
      rateLimit: input.rateLimit || 100,
      expiresAt: input.expiresAt || null,
      createdBy: input.createdBy || null,
    })
    .returning();

  return {
    apiKey: {
      id: record.id,
      name: record.name,
      keyPrefix: record.keyPrefix,
      scopes: record.scopes as string[],
      environment: record.environment,
      rateLimit: record.rateLimit,
      expiresAt: record.expiresAt,
      lastUsedAt: record.lastUsedAt,
      isActive: record.isActive,
      createdAt: record.createdAt,
      revokedAt: record.revokedAt,
    },
    rawKey: raw,
  };
}

// ============================================
// List API Keys for organization
// ============================================

export async function listApiKeys(organizationId: number): Promise<ApiKeyListItem[]> {
  const records = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      environment: apiKeys.environment,
      rateLimit: apiKeys.rateLimit,
      expiresAt: apiKeys.expiresAt,
      lastUsedAt: apiKeys.lastUsedAt,
      isActive: apiKeys.isActive,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.organizationId, organizationId))
    .orderBy(desc(apiKeys.createdAt));

  return records.map((r) => ({
    ...r,
    scopes: (r.scopes as string[]) || [],
  }));
}

// ============================================
// Get single API Key
// ============================================

export async function getApiKey(id: number, organizationId: number): Promise<ApiKeyListItem | null> {
  const [record] = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      environment: apiKeys.environment,
      rateLimit: apiKeys.rateLimit,
      expiresAt: apiKeys.expiresAt,
      lastUsedAt: apiKeys.lastUsedAt,
      isActive: apiKeys.isActive,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId)))
    .limit(1);

  if (!record) return null;

  return {
    ...record,
    scopes: (record.scopes as string[]) || [],
  };
}

// ============================================
// Update API Key
// ============================================

export async function updateApiKey(
  id: number,
  organizationId: number,
  input: UpdateApiKeyInput
): Promise<ApiKeyListItem | null> {
  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.scopes !== undefined) updateData.scopes = input.scopes;
  if (input.rateLimit !== undefined) updateData.rateLimit = input.rateLimit;
  if (input.expiresAt !== undefined) updateData.expiresAt = input.expiresAt;

  if (Object.keys(updateData).length === 0) return getApiKey(id, organizationId);

  const [record] = await db
    .update(apiKeys)
    .set(updateData)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId)))
    .returning();

  if (!record) return null;

  return {
    id: record.id,
    name: record.name,
    keyPrefix: record.keyPrefix,
    scopes: (record.scopes as string[]) || [],
    environment: record.environment,
    rateLimit: record.rateLimit,
    expiresAt: record.expiresAt,
    lastUsedAt: record.lastUsedAt,
    isActive: record.isActive,
    createdAt: record.createdAt,
    revokedAt: record.revokedAt,
  };
}

// ============================================
// Revoke API Key
// ============================================

export async function revokeApiKey(
  id: number,
  organizationId: number,
  revokedBy?: string
): Promise<boolean> {
  const [record] = await db
    .update(apiKeys)
    .set({
      isActive: false,
      revokedAt: new Date(),
      revokedBy: revokedBy || null,
    })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId)))
    .returning({ id: apiKeys.id });

  return !!record;
}

// ============================================
// Log API request
// ============================================

export async function logApiRequest(params: {
  apiKeyId: number;
  method: string;
  path: string;
  statusCode: number;
  responseTimeMs: number;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
  errorCode?: string;
}): Promise<void> {
  try {
    await db.insert(apiKeyLogs).values({
      apiKeyId: params.apiKeyId,
      method: params.method,
      path: params.path,
      statusCode: params.statusCode,
      responseTimeMs: params.responseTimeMs,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      requestId: params.requestId,
      errorCode: params.errorCode || null,
    });
  } catch (error) {
    console.error("[API] Failed to log request:", error);
  }
}

// ============================================
// Get API usage stats for organization
// ============================================

export async function getApiUsageStats(organizationId: number, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [totalKeys] = await db
    .select({ count: count() })
    .from(apiKeys)
    .where(and(eq(apiKeys.organizationId, organizationId), eq(apiKeys.isActive, true)));

  const [totalRequests] = await db
    .select({ count: count() })
    .from(apiKeyLogs)
    .innerJoin(apiKeys, eq(apiKeyLogs.apiKeyId, apiKeys.id))
    .where(
      and(
        eq(apiKeys.organizationId, organizationId),
        gt(apiKeyLogs.createdAt, since)
      )
    );

  const [errorRequests] = await db
    .select({ count: count() })
    .from(apiKeyLogs)
    .innerJoin(apiKeys, eq(apiKeyLogs.apiKeyId, apiKeys.id))
    .where(
      and(
        eq(apiKeys.organizationId, organizationId),
        gt(apiKeyLogs.createdAt, since),
        gt(apiKeyLogs.statusCode, 399)
      )
    );

  return {
    active_keys: totalKeys?.count ?? 0,
    total_requests: totalRequests?.count ?? 0,
    error_requests: errorRequests?.count ?? 0,
    period_days: days,
  };
}

// ============================================
// Get recent logs for API key
// ============================================

export async function getApiKeyRecentLogs(
  apiKeyId: number,
  limit = 50
) {
  return db
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
    })
    .from(apiKeyLogs)
    .where(eq(apiKeyLogs.apiKeyId, apiKeyId))
    .orderBy(desc(apiKeyLogs.createdAt))
    .limit(limit);
}

// ============================================
// Count API keys for organization (for plan limits)
// ============================================

export async function countApiKeys(organizationId: number): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(apiKeys)
    .where(and(eq(apiKeys.organizationId, organizationId), eq(apiKeys.isActive, true)));
  return result?.count ?? 0;
}
