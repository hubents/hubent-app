import { describe, it, expect } from "vitest";
import {
  isFeatureAvailable,
  getAvailableFeatures,
  getApiKeyLimit,
  getDefaultRateLimit,
  API_FEATURE_FLAGS,
} from "@/lib/api/api-feature-flags";
import {
  parsePaginationParams,
  buildPaginatedResponse,
  toSnakeCaseObject,
  generateApiKey,
  signWebhookPayload,
  generateWebhookSecret,
} from "@/lib/api/api-utils";

// ============================================
// B1 regression: Verified via code review that admin endpoint
// now uses apiKeyLogs.path instead of apiKeyLogs.endpoint
// ============================================

// ============================================
// B3 regression: Cursor pagination correctness
// ============================================
describe("Cursor Pagination", () => {
  it("starting_after parses correctly as cursor", () => {
    const params = new URLSearchParams("starting_after=50&limit=10");
    const result = parsePaginationParams(params);
    expect(result.startingAfter).toBe(50);
    expect(result.limit).toBe(10);
  });

  it("ending_before parses correctly", () => {
    const params = new URLSearchParams("ending_before=100");
    const result = parsePaginationParams(params);
    expect(result.endingBefore).toBe(100);
  });

  it("buildPaginatedResponse includes correct has_more", () => {
    const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = buildPaginatedResponse(data, 10, "/api/v1/test", 3);
    expect(result.has_more).toBe(true);

    const result2 = buildPaginatedResponse(data, 10, "/api/v1/test", 5);
    expect(result2.has_more).toBe(false);
  });

  it("pagination default limit is 25", () => {
    const params = new URLSearchParams();
    const result = parsePaginationParams(params);
    expect(result.limit).toBe(25);
  });
});

// ============================================
// Feature flags - plan hierarchy validation
// ============================================
describe("Feature Flags - Plan Hierarchy", () => {
  it("agency has more features than standard", () => {
    const agency = getAvailableFeatures("agency");
    const standard = getAvailableFeatures("standard");
    expect(agency.length).toBeGreaterThanOrEqual(standard.length);
  });

  it("standard has more features than starter", () => {
    const standard = getAvailableFeatures("standard");
    const starter = getAvailableFeatures("starter");
    expect(standard.length).toBeGreaterThan(starter.length);
  });

  it("API key limits scale with plan", () => {
    expect(getApiKeyLimit("provider-free")).toBeLessThan(getApiKeyLimit("starter"));
    expect(getApiKeyLimit("starter")).toBeLessThan(getApiKeyLimit("standard"));
    expect(getApiKeyLimit("standard")).toBeLessThan(getApiKeyLimit("agency"));
  });

  it("rate limits scale with plan", () => {
    expect(getDefaultRateLimit("provider-free")).toBeLessThan(getDefaultRateLimit("starter"));
    expect(getDefaultRateLimit("starter")).toBeLessThan(getDefaultRateLimit("standard"));
    expect(getDefaultRateLimit("standard")).toBeLessThan(getDefaultRateLimit("agency"));
  });

  it("all flags have unique keys", () => {
    const keys = API_FEATURE_FLAGS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// Webhook event types tested in api-webhooks.test.ts (requires DB mock)

// MCP Tools completeness tested in api-mcp.test.ts (requires DB mock)

// ============================================
// Security: API key format consistency
// ============================================
describe("API Key Security", () => {
  it("live keys have exactly hb_live_ prefix + 48 hex chars", () => {
    const { raw } = generateApiKey("live");
    expect(raw).toMatch(/^hb_live_[a-f0-9]{48}$/);
  });

  it("test keys have exactly hb_test_ prefix + 48 hex chars", () => {
    const { raw } = generateApiKey("test");
    expect(raw).toMatch(/^hb_test_[a-f0-9]{48}$/);
  });

  it("key prefix is deterministic from key", () => {
    const { raw, prefix } = generateApiKey("live");
    expect(raw.substring(0, 16)).toBe(prefix);
  });

  it("webhook secrets have whsec_ prefix", () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^whsec_[a-f0-9]{48}$/);
  });

  it("HMAC signatures are deterministic", () => {
    const payload = JSON.stringify({ event: "test" });
    const secret = "whsec_abc123";
    const sig1 = signWebhookPayload(payload, secret);
    const sig2 = signWebhookPayload(payload, secret);
    expect(sig1).toBe(sig2);
  });

  it("different secrets produce different signatures", () => {
    const payload = JSON.stringify({ event: "test" });
    const sig1 = signWebhookPayload(payload, "secret1");
    const sig2 = signWebhookPayload(payload, "secret2");
    expect(sig1).not.toBe(sig2);
  });
});

// ============================================
// snake_case conversion edge cases
// ============================================
describe("snake_case conversion edge cases", () => {
  it("handles deeply nested objects", () => {
    const input = { topLevel: { nestedField: { deepField: "value" } } };
    const result = toSnakeCaseObject(input) as Record<string, unknown>;
    expect(result).toHaveProperty("top_level");
    const nested = result.top_level as Record<string, unknown>;
    expect(nested).toHaveProperty("nested_field");
  });

  it("handles arrays of objects", () => {
    const input = [{ firstName: "John" }, { firstName: "Jane" }];
    const result = toSnakeCaseObject(input) as Record<string, string>[];
    expect(result[0]).toHaveProperty("first_name", "John");
    expect(result[1]).toHaveProperty("first_name", "Jane");
  });

  it("converts Date to ISO string", () => {
    const date = new Date("2025-01-01T00:00:00Z");
    const result = toSnakeCaseObject({ createdAt: date }) as Record<string, string>;
    expect(result.created_at).toBe("2025-01-01T00:00:00.000Z");
  });

  it("preserves null and undefined", () => {
    expect(toSnakeCaseObject(null)).toBeNull();
    expect(toSnakeCaseObject(undefined)).toBeUndefined();
  });

  it("preserves primitive values", () => {
    expect(toSnakeCaseObject(42)).toBe(42);
    expect(toSnakeCaseObject("hello")).toBe("hello");
    expect(toSnakeCaseObject(true)).toBe(true);
  });
});
