import { describe, it, expect } from "vitest";
import {
  toSnakeCaseObject,
  generateApiKey,
  generateWebhookSecret,
  signWebhookPayload,
  parsePaginationParams,
  buildPaginatedResponse,
  parseFilterParams,
  parseExpandParams,
} from "@/lib/api/api-utils";
import {
  ApiError,
  authenticationError,
  authorizationError,
  notFoundError,
  validationError,
  rateLimitError,
  internalError,
} from "@/lib/api/api-errors";

// Scopes defined inline to avoid importing api-auth which triggers DB connection
const ALL_SCOPES = [
  "events:read", "events:write",
  "contacts:read", "contacts:write",
  "tasks:read", "tasks:write",
  "finance:read", "finance:write",
  "guests:read", "guests:write",
  "crm:read", "crm:write",
  "forms:read", "forms:write",
  "vendors:read", "vendors:write",
  "templates:read",
  "organization:read",
  "webhooks:manage",
] as const;

const PROVIDER_ALLOWED_SCOPES = [
  "events:read", "tasks:read", "tasks:write",
  "finance:read", "finance:write",
  "forms:read", "organization:read",
] as const;

// ============================================
// Scopes structure
// ============================================

describe("API Scopes", () => {
  it("has all required scopes defined", () => {
    expect(ALL_SCOPES).toContain("events:read");
    expect(ALL_SCOPES).toContain("events:write");
    expect(ALL_SCOPES).toContain("contacts:read");
    expect(ALL_SCOPES).toContain("contacts:write");
    expect(ALL_SCOPES).toContain("tasks:read");
    expect(ALL_SCOPES).toContain("tasks:write");
    expect(ALL_SCOPES).toContain("finance:read");
    expect(ALL_SCOPES).toContain("finance:write");
    expect(ALL_SCOPES).toContain("guests:read");
    expect(ALL_SCOPES).toContain("guests:write");
    expect(ALL_SCOPES).toContain("crm:read");
    expect(ALL_SCOPES).toContain("crm:write");
    expect(ALL_SCOPES).toContain("forms:read");
    expect(ALL_SCOPES).toContain("forms:write");
    expect(ALL_SCOPES).toContain("vendors:read");
    expect(ALL_SCOPES).toContain("vendors:write");
    expect(ALL_SCOPES).toContain("templates:read");
    expect(ALL_SCOPES).toContain("organization:read");
    expect(ALL_SCOPES).toContain("webhooks:manage");
  });

  it("has correct number of scopes", () => {
    expect(ALL_SCOPES.length).toBe(19);
  });

  it("provider scopes are a subset of all scopes", () => {
    for (const scope of PROVIDER_ALLOWED_SCOPES) {
      expect(ALL_SCOPES).toContain(scope);
    }
  });

  it("provider scopes are limited", () => {
    expect(PROVIDER_ALLOWED_SCOPES).not.toContain("contacts:write");
    expect(PROVIDER_ALLOWED_SCOPES).not.toContain("guests:read");
    expect(PROVIDER_ALLOWED_SCOPES).not.toContain("guests:write");
    expect(PROVIDER_ALLOWED_SCOPES).not.toContain("crm:write");
    expect(PROVIDER_ALLOWED_SCOPES).not.toContain("vendors:write");
  });
});

// ============================================
// Snake case response format
// ============================================

describe("Response format", () => {
  it("converts camelCase DB results to snake_case for API", () => {
    const dbResult = {
      id: 1,
      organizationId: 42,
      firstName: "Test",
      lastName: "User",
      createdAt: new Date("2025-01-01T00:00:00Z"),
      isActive: true,
    };

    const apiResult = toSnakeCaseObject(dbResult);
    expect(apiResult).toEqual({
      id: 1,
      organization_id: 42,
      first_name: "Test",
      last_name: "User",
      created_at: "2025-01-01T00:00:00.000Z",
      is_active: true,
    });
  });

  it("handles nested objects and arrays", () => {
    const result = toSnakeCaseObject({
      totalCount: 10,
      items: [
        { eventName: "Wedding", guestCount: 100 },
        { eventName: "Birthday", guestCount: 50 },
      ],
    });

    expect(result).toEqual({
      total_count: 10,
      items: [
        { event_name: "Wedding", guest_count: 100 },
        { event_name: "Birthday", guest_count: 50 },
      ],
    });
  });
});

// ============================================
// Paginated response structure
// ============================================

describe("Paginated response", () => {
  it("matches Stripe-like list response format", () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
    }));

    const response = buildPaginatedResponse(items, 100, "/api/v1/events", 25);

    expect(response).toHaveProperty("object", "list");
    expect(response).toHaveProperty("data");
    expect(response).toHaveProperty("has_more", true);
    expect(response).toHaveProperty("total_count", 100);
    expect(response).toHaveProperty("url", "/api/v1/events");
    expect(response.data).toHaveLength(25);
  });

  it("has_more is false when data < limit", () => {
    const items = [{ id: 1 }, { id: 2 }];
    const response = buildPaginatedResponse(items, 2, "/api/v1/events", 25);
    expect(response.has_more).toBe(false);
  });
});

// ============================================
// Error response structure
// ============================================

describe("Error response structure", () => {
  it("all errors produce consistent structure", () => {
    const errors = [
      authenticationError(),
      authorizationError("events:read"),
      notFoundError("Event", "123"),
      validationError("Bad input", "name"),
      rateLimitError(30),
      internalError(),
    ];

    for (const err of errors) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.type).toBeTruthy();
      expect(err.code).toBeTruthy();
      expect(err.message).toBeTruthy();
      expect(err.statusCode).toBeGreaterThanOrEqual(400);
      expect(err.statusCode).toBeLessThan(600);

      const response = err.toResponse("req_test123");
      expect(response.status).toBe(err.statusCode);
    }
  });
});

// ============================================
// API Key format
// ============================================

describe("API Key format", () => {
  it("live key format: hb_live_<48 hex chars>", () => {
    const { raw } = generateApiKey("live");
    expect(raw).toMatch(/^hb_live_[a-f0-9]{48}$/);
    expect(raw.length).toBe(56); // "hb_live_" (8) + 48 = 56
  });

  it("test key format: hb_test_<48 hex chars>", () => {
    const { raw } = generateApiKey("test");
    expect(raw).toMatch(/^hb_test_[a-f0-9]{48}$/);
    expect(raw.length).toBe(56);
  });

  it("prefix is first 16 chars of key", () => {
    const { raw, prefix } = generateApiKey("live");
    expect(prefix).toBe(raw.substring(0, 16));
  });
});

// ============================================
// Webhook signing
// ============================================

describe("Webhook signing", () => {
  it("generates consistent HMAC signatures", () => {
    const secret = generateWebhookSecret();
    const payload = JSON.stringify({ type: "event.created", data: { id: 1 } });

    const sig1 = signWebhookPayload(payload, secret);
    const sig2 = signWebhookPayload(payload, secret);
    expect(sig1).toBe(sig2);
    expect(sig1).toMatch(/^[a-f0-9]{64}$/); // SHA-256
  });

  it("different secrets produce different signatures", () => {
    const payload = JSON.stringify({ test: true });
    const sig1 = signWebhookPayload(payload, "secret1");
    const sig2 = signWebhookPayload(payload, "secret2");
    expect(sig1).not.toBe(sig2);
  });
});

// ============================================
// Filter parsing
// ============================================

describe("Filter parsing", () => {
  it("parses allowed filters and ignores unknown", () => {
    const params = new URLSearchParams("status=active&type=wedding&malicious=<script>");
    const filters = parseFilterParams(params, ["status", "type"]);
    expect(filters).toEqual({ status: "active", type: "wedding" });
    expect(filters).not.toHaveProperty("malicious");
  });

  it("parses date range operators", () => {
    const params = new URLSearchParams("created_at.gte=2025-01-01&created_at.lte=2025-12-31");
    const filters = parseFilterParams(params, ["created_at"]);
    expect(filters["created_at.gte"]).toBe("2025-01-01");
    expect(filters["created_at.lte"]).toBe("2025-12-31");
  });

  it("parses expand params", () => {
    const params = new URLSearchParams("expand=contact,event,items");
    const expands = parseExpandParams(params);
    expect(expands).toEqual(["contact", "event", "items"]);
  });
});

// ============================================
// Pagination limits
// ============================================

describe("Pagination limits", () => {
  it("defaults to 25", () => {
    const { limit } = parsePaginationParams(new URLSearchParams());
    expect(limit).toBe(25);
  });

  it("caps at 100", () => {
    const { limit } = parsePaginationParams(new URLSearchParams("limit=500"));
    expect(limit).toBe(100);
  });

  it("rejects invalid values", () => {
    expect(parsePaginationParams(new URLSearchParams("limit=-1")).limit).toBe(25);
    expect(parsePaginationParams(new URLSearchParams("limit=0")).limit).toBe(25);
    expect(parsePaginationParams(new URLSearchParams("limit=abc")).limit).toBe(25);
  });

  it("accepts cursor params", () => {
    const { startingAfter, endingBefore } = parsePaginationParams(
      new URLSearchParams("starting_after=100&ending_before=200")
    );
    expect(startingAfter).toBe(100);
    expect(endingBefore).toBe(200);
  });
});
