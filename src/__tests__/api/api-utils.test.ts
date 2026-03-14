import { describe, it, expect } from "vitest";
import {
  toSnakeCase,
  toSnakeCaseObject,
  toCamelCase,
  toCamelCaseObject,
  generateRequestId,
  generateApiKey,
  generateWebhookSecret,
  signWebhookPayload,
  sha256,
  hashBody,
  parsePaginationParams,
  buildPaginatedResponse,
  parseFilterParams,
  parseExpandParams,
  apiHeaders,
} from "@/lib/api/api-utils";

// ============================================
// Snake/Camel case conversion
// ============================================

describe("toSnakeCase", () => {
  it("converts camelCase to snake_case", () => {
    expect(toSnakeCase("organizationId")).toBe("organization_id");
    expect(toSnakeCase("createdAt")).toBe("created_at");
    expect(toSnakeCase("firstName")).toBe("first_name");
    expect(toSnakeCase("id")).toBe("id");
    expect(toSnakeCase("isActive")).toBe("is_active");
  });

  it("handles already snake_case", () => {
    expect(toSnakeCase("already_snake")).toBe("already_snake");
  });

  it("handles single word", () => {
    expect(toSnakeCase("name")).toBe("name");
  });
});

describe("toSnakeCaseObject", () => {
  it("converts object keys to snake_case", () => {
    const input = {
      organizationId: 1,
      firstName: "John",
      isActive: true,
    };
    expect(toSnakeCaseObject(input)).toEqual({
      organization_id: 1,
      first_name: "John",
      is_active: true,
    });
  });

  it("handles nested objects", () => {
    const input = {
      userData: {
        firstName: "Jane",
        lastName: "Doe",
      },
    };
    expect(toSnakeCaseObject(input)).toEqual({
      user_data: {
        first_name: "Jane",
        last_name: "Doe",
      },
    });
  });

  it("handles arrays", () => {
    const input = [
      { firstName: "A" },
      { firstName: "B" },
    ];
    expect(toSnakeCaseObject(input)).toEqual([
      { first_name: "A" },
      { first_name: "B" },
    ]);
  });

  it("handles null and undefined", () => {
    expect(toSnakeCaseObject(null)).toBeNull();
    expect(toSnakeCaseObject(undefined)).toBeUndefined();
  });

  it("converts Date to ISO string", () => {
    const date = new Date("2025-01-15T10:00:00Z");
    expect(toSnakeCaseObject(date)).toBe("2025-01-15T10:00:00.000Z");
  });
});

describe("toCamelCase", () => {
  it("converts snake_case to camelCase", () => {
    expect(toCamelCase("organization_id")).toBe("organizationId");
    expect(toCamelCase("created_at")).toBe("createdAt");
    expect(toCamelCase("first_name")).toBe("firstName");
  });
});

describe("toCamelCaseObject", () => {
  it("converts object keys to camelCase", () => {
    const input = {
      organization_id: 1,
      first_name: "John",
    };
    expect(toCamelCaseObject(input)).toEqual({
      organizationId: 1,
      firstName: "John",
    });
  });
});

// ============================================
// Request ID
// ============================================

describe("generateRequestId", () => {
  it("generates unique IDs with req_ prefix", () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    expect(id1).toMatch(/^req_[a-f0-9]{24}$/);
    expect(id2).toMatch(/^req_[a-f0-9]{24}$/);
    expect(id1).not.toBe(id2);
  });
});

// ============================================
// API Key generation
// ============================================

describe("generateApiKey", () => {
  it("generates live key with correct format", () => {
    const { raw, hash, prefix } = generateApiKey("live");
    expect(raw).toMatch(/^hb_live_[a-f0-9]{48}$/);
    expect(hash).toHaveLength(64); // SHA-256 hex
    expect(prefix).toBe(raw.substring(0, 16));
    expect(prefix).toMatch(/^hb_live_/);
  });

  it("generates test key with correct format", () => {
    const { raw } = generateApiKey("test");
    expect(raw).toMatch(/^hb_test_[a-f0-9]{48}$/);
  });

  it("generates unique keys", () => {
    const key1 = generateApiKey("live");
    const key2 = generateApiKey("live");
    expect(key1.raw).not.toBe(key2.raw);
    expect(key1.hash).not.toBe(key2.hash);
  });

  it("hash is deterministic for same input", () => {
    const hash1 = sha256("test-input");
    const hash2 = sha256("test-input");
    expect(hash1).toBe(hash2);
  });
});

// ============================================
// Webhook secret + signing
// ============================================

describe("generateWebhookSecret", () => {
  it("generates secret with whsec_ prefix", () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^whsec_[a-f0-9]{48}$/);
  });
});

describe("signWebhookPayload", () => {
  it("generates consistent HMAC signature", () => {
    const payload = JSON.stringify({ event: "test" });
    const secret = "whsec_abc123";
    const sig1 = signWebhookPayload(payload, secret);
    const sig2 = signWebhookPayload(payload, secret);
    expect(sig1).toBe(sig2);
    expect(sig1).toHaveLength(64); // SHA-256 HMAC hex
  });

  it("different payloads produce different signatures", () => {
    const secret = "whsec_abc123";
    const sig1 = signWebhookPayload('{"a":1}', secret);
    const sig2 = signWebhookPayload('{"a":2}', secret);
    expect(sig1).not.toBe(sig2);
  });
});

// ============================================
// Body hash
// ============================================

describe("hashBody", () => {
  it("hashes objects deterministically", () => {
    expect(hashBody({ a: 1 })).toBe(hashBody({ a: 1 }));
  });

  it("hashes null/undefined as empty string hash", () => {
    expect(hashBody(null)).toBe(hashBody(undefined));
  });
});

// ============================================
// Pagination
// ============================================

describe("parsePaginationParams", () => {
  it("parses default values", () => {
    const params = new URLSearchParams();
    const result = parsePaginationParams(params);
    expect(result.limit).toBe(25);
    expect(result.startingAfter).toBeUndefined();
    expect(result.endingBefore).toBeUndefined();
  });

  it("parses limit with min/max bounds", () => {
    expect(parsePaginationParams(new URLSearchParams("limit=50")).limit).toBe(50);
    expect(parsePaginationParams(new URLSearchParams("limit=0")).limit).toBe(25);
    expect(parsePaginationParams(new URLSearchParams("limit=200")).limit).toBe(100);
    expect(parsePaginationParams(new URLSearchParams("limit=abc")).limit).toBe(25);
  });

  it("parses cursor params", () => {
    const params = new URLSearchParams("starting_after=42&limit=10");
    const result = parsePaginationParams(params);
    expect(result.startingAfter).toBe(42);
    expect(result.limit).toBe(10);
  });
});

describe("buildPaginatedResponse", () => {
  it("builds correct paginated response", () => {
    const data = [{ id: 1 }, { id: 2 }];
    const result = buildPaginatedResponse(data, 50, "/api/v1/events", 25);
    expect(result.object).toBe("list");
    expect(result.data).toHaveLength(2);
    expect(result.has_more).toBe(false); // 2 < 25
    expect(result.total_count).toBe(50);
    expect(result.url).toBe("/api/v1/events");
  });

  it("sets has_more when data length equals limit", () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
    const result = buildPaginatedResponse(data, 100, "/api/v1/events", 10);
    expect(result.has_more).toBe(true);
  });
});

// ============================================
// Filters & Expand
// ============================================

describe("parseFilterParams", () => {
  it("parses allowed filters", () => {
    const params = new URLSearchParams("status=active&name=test&bad=value");
    const result = parseFilterParams(params, ["status", "name"]);
    expect(result).toEqual({ status: "active", name: "test" });
    expect(result).not.toHaveProperty("bad");
  });

  it("parses date range filters", () => {
    const params = new URLSearchParams("date.gte=2025-01-01&date.lte=2025-12-31");
    const result = parseFilterParams(params, ["date"]);
    expect(result["date.gte"]).toBe("2025-01-01");
    expect(result["date.lte"]).toBe("2025-12-31");
  });
});

describe("parseExpandParams", () => {
  it("parses comma-separated expand params", () => {
    const params = new URLSearchParams("expand=contact,event");
    expect(parseExpandParams(params)).toEqual(["contact", "event"]);
  });

  it("returns empty array when no expand", () => {
    expect(parseExpandParams(new URLSearchParams())).toEqual([]);
  });
});

// ============================================
// API Headers
// ============================================

describe("apiHeaders", () => {
  it("returns standard headers", () => {
    const headers = apiHeaders("req_123");
    expect(headers["X-Request-Id"]).toBe("req_123");
    expect(headers["X-HubEnts-Version"]).toBe("2025-03-14");
    expect(headers["Cache-Control"]).toBe("no-store");
  });

  it("merges extra headers", () => {
    const headers = apiHeaders("req_123", { "X-Custom": "val" });
    expect(headers["X-Custom"]).toBe("val");
    expect(headers["X-Request-Id"]).toBe("req_123");
  });
});
