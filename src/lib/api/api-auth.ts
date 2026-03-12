import { NextRequest } from "next/server";
import { db } from "@/db";
import { apiKeys, organizations, subscriptions, subscriptionPlans } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { sha256 } from "./api-utils";
import {
  authenticationError,
  authorizationError,
  apiKeyExpiredError,
  apiKeyRevokedError,
  subscriptionRequiredError,
  ApiError,
} from "./api-errors";

// ============================================
// API Key Session (mirrors TenantSession for API context)
// ============================================

export interface ApiKeySession {
  apiKeyId: number;
  apiKeyName: string;
  organizationId: number;
  orgType: string;
  scopes: string[];
  environment: string;
  rateLimit: number;
  plan: {
    slug: string;
    name: string;
    limits: Record<string, number>;
  } | null;
  subscriptionStatus: string | null;
}

// ============================================
// Scope definitions
// ============================================

export const ALL_SCOPES = [
  "events:read",
  "events:write",
  "contacts:read",
  "contacts:write",
  "tasks:read",
  "tasks:write",
  "finance:read",
  "finance:write",
  "guests:read",
  "guests:write",
  "crm:read",
  "crm:write",
  "forms:read",
  "forms:write",
  "vendors:read",
  "vendors:write",
  "templates:read",
  "organization:read",
  "webhooks:manage",
] as const;

export type ApiScope = (typeof ALL_SCOPES)[number];

export const PROVIDER_ALLOWED_SCOPES: ApiScope[] = [
  "events:read",
  "tasks:read",
  "tasks:write",
  "finance:read",
  "finance:write",
  "forms:read",
  "organization:read",
];

// ============================================
// Authenticate API Key from request
// ============================================

export async function authenticateApiKey(request: NextRequest): Promise<ApiKeySession> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    throw authenticationError("Missing Authorization header.");
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    throw authenticationError("Invalid Authorization header format. Use: Bearer <api_key>");
  }

  const rawKey = parts[1];
  if (!rawKey.startsWith("hb_live_") && !rawKey.startsWith("hb_test_")) {
    throw authenticationError("Invalid API key format.");
  }

  const keyHash = sha256(rawKey);

  const [keyRecord] = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      organizationId: apiKeys.organizationId,
      scopes: apiKeys.scopes,
      environment: apiKeys.environment,
      rateLimit: apiKeys.rateLimit,
      isActive: apiKeys.isActive,
      expiresAt: apiKeys.expiresAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!keyRecord) {
    throw authenticationError();
  }

  if (keyRecord.revokedAt) {
    throw apiKeyRevokedError();
  }

  if (!keyRecord.isActive) {
    throw apiKeyRevokedError();
  }

  if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
    throw apiKeyExpiredError();
  }

  // Update last_used_at (fire-and-forget)
  void db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyRecord.id))
    .execute()
    .catch(() => {});

  // Get organization + subscription info
  const [org] = await db
    .select({
      id: organizations.id,
      orgType: organizations.orgType,
      planId: organizations.planId,
      status: organizations.status,
    })
    .from(organizations)
    .where(eq(organizations.id, keyRecord.organizationId))
    .limit(1);

  if (!org || org.status === "suspended" || org.status === "deleted") {
    throw new ApiError(
      "authorization_error",
      "organization_inactive",
      "Organization is not active.",
      403
    );
  }

  // Get subscription status
  let subscriptionStatus: string | null = null;
  const [sub] = await db
    .select({ status: subscriptions.status })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, org.id),
        isNull(subscriptions.canceledAt)
      )
    )
    .limit(1);

  if (sub) {
    subscriptionStatus = sub.status;
  }

  // Check subscription is active
  if (!subscriptionStatus || subscriptionStatus === "canceled") {
    throw subscriptionRequiredError();
  }

  // Get plan info
  let plan: ApiKeySession["plan"] = null;
  if (org.planId) {
    const [planRecord] = await db
      .select({
        slug: subscriptionPlans.slug,
        name: subscriptionPlans.name,
        limits: subscriptionPlans.limits,
      })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, org.planId))
      .limit(1);

    if (planRecord) {
      plan = {
        slug: planRecord.slug,
        name: planRecord.name,
        limits: (planRecord.limits as Record<string, number>) || {},
      };
    }
  }

  return {
    apiKeyId: keyRecord.id,
    apiKeyName: keyRecord.name,
    organizationId: keyRecord.organizationId,
    orgType: org.orgType || "tenant",
    scopes: (keyRecord.scopes as string[]) || [],
    environment: keyRecord.environment,
    rateLimit: keyRecord.rateLimit || 100,
    plan,
    subscriptionStatus,
  };
}

// ============================================
// Scope checking
// ============================================

export function requireScope(session: ApiKeySession, scope: ApiScope): void {
  if (!session.scopes.includes(scope)) {
    throw authorizationError(scope);
  }
}

export function hasScope(session: ApiKeySession, scope: ApiScope): boolean {
  return session.scopes.includes(scope);
}
