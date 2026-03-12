import { NextRequest } from "next/server";
import crypto from "crypto";

// ============================================
// Request ID
// ============================================

export function generateRequestId(): string {
  return `req_${crypto.randomBytes(12).toString("hex")}`;
}

// ============================================
// Snake_case conversion (camelCase → snake_case)
// ============================================

export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function toSnakeCaseObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(toSnakeCaseObject);
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[toSnakeCase(key)] = toSnakeCaseObject(value);
    }
    return result;
  }
  return obj;
}

export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function toCamelCaseObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCaseObject);
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[toCamelCase(key)] = toCamelCaseObject(value);
    }
    return result;
  }
  return obj;
}

// ============================================
// Cursor-based pagination helpers
// ============================================

export interface CursorPaginationParams {
  limit: number;
  startingAfter?: number;
  endingBefore?: number;
}

export interface PaginatedResponse<T> {
  object: "list";
  data: T[];
  has_more: boolean;
  total_count: number;
  url: string;
}

export function parsePaginationParams(searchParams: URLSearchParams): CursorPaginationParams {
  const limitStr = searchParams.get("limit");
  let limit = limitStr ? parseInt(limitStr, 10) : 25;
  if (isNaN(limit) || limit < 1) limit = 25;
  if (limit > 100) limit = 100;

  const startingAfterStr = searchParams.get("starting_after");
  const endingBeforeStr = searchParams.get("ending_before");

  return {
    limit,
    startingAfter: startingAfterStr ? parseInt(startingAfterStr, 10) : undefined,
    endingBefore: endingBeforeStr ? parseInt(endingBeforeStr, 10) : undefined,
  };
}

export function buildPaginatedResponse<T extends { id?: number }>(
  data: T[],
  totalCount: number,
  url: string,
  limit: number
): PaginatedResponse<T> {
  return {
    object: "list",
    data,
    has_more: data.length === limit,
    total_count: totalCount,
    url,
  };
}

// ============================================
// Query filter helpers
// ============================================

export function parseFilterParams(searchParams: URLSearchParams, allowedFilters: string[]): Record<string, string> {
  const filters: Record<string, string> = {};
  for (const key of allowedFilters) {
    const value = searchParams.get(key);
    if (value) {
      filters[key] = value;
    }
    // Support date range filters: field.gte, field.lte, field.gt, field.lt
    for (const op of ["gte", "lte", "gt", "lt"]) {
      const rangeValue = searchParams.get(`${key}.${op}`);
      if (rangeValue) {
        filters[`${key}.${op}`] = rangeValue;
      }
    }
  }
  return filters;
}

// ============================================
// Expand helpers
// ============================================

export function parseExpandParams(searchParams: URLSearchParams): string[] {
  const expand = searchParams.get("expand");
  if (!expand) return [];
  return expand.split(",").map((s) => s.trim()).filter(Boolean);
}

// ============================================
// IP extraction
// ============================================

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ============================================
// SHA-256 hashing
// ============================================

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// ============================================
// API Key generation
// ============================================

export function generateApiKey(environment: "live" | "test" = "live"): { raw: string; hash: string; prefix: string } {
  const randomPart = crypto.randomBytes(24).toString("hex"); // 48 chars
  const raw = `hb_${environment}_${randomPart}`;
  const hash = sha256(raw);
  const prefix = raw.substring(0, 16);
  return { raw, hash, prefix };
}

// ============================================
// Webhook secret generation
// ============================================

export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("hex")}`;
}

// ============================================
// HMAC signing for webhooks
// ============================================

export function signWebhookPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

// ============================================
// Body hash for idempotency
// ============================================

export function hashBody(body: unknown): string {
  const str = typeof body === "string" ? body : JSON.stringify(body ?? "");
  return sha256(str);
}

// ============================================
// Standard API response headers
// ============================================

export function apiHeaders(requestId: string, extra?: Record<string, string>): Record<string, string> {
  return {
    "X-Request-Id": requestId,
    "X-HubEnts-Version": "2025-01-01",
    "Cache-Control": "no-store",
    ...extra,
  };
}
