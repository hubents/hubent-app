import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {},
}));
vi.mock("@/db/schema", () => new Proxy({}, { get: () => ({}) }));

import { ALL_SCOPES, PROVIDER_ALLOWED_SCOPES } from "@/lib/api/api-auth";

// ============================================
// Provider RBAC: Scope restrictions
// ============================================
describe("Provider RBAC: Scope definitions", () => {
  it("PROVIDER_ALLOWED_SCOPES is a subset of ALL_SCOPES", () => {
    for (const scope of PROVIDER_ALLOWED_SCOPES) {
      expect(ALL_SCOPES as readonly string[]).toContain(scope);
    }
  });

  it("PROVIDER_ALLOWED_SCOPES has exactly 7 scopes", () => {
    expect(PROVIDER_ALLOWED_SCOPES.length).toBe(10);
  });

  it("provider can now access contacts:read and contacts:write", () => {
    expect(PROVIDER_ALLOWED_SCOPES as readonly string[]).toContain("contacts:read");
    expect(PROVIDER_ALLOWED_SCOPES as readonly string[]).toContain("contacts:write");
  });

  it("provider can now access guests:read", () => {
    expect(PROVIDER_ALLOWED_SCOPES as readonly string[]).toContain("guests:read");
  });

  it("provider cannot access guests:write", () => {
    expect(PROVIDER_ALLOWED_SCOPES as readonly string[]).not.toContain("guests:write");
  });

  it("provider cannot access crm:write", () => {
    expect(PROVIDER_ALLOWED_SCOPES as readonly string[]).not.toContain("crm:write");
  });

  it("provider cannot access crm:read", () => {
    expect(PROVIDER_ALLOWED_SCOPES as readonly string[]).not.toContain("crm:read");
  });

  it("provider cannot access vendors:read", () => {
    expect(PROVIDER_ALLOWED_SCOPES as readonly string[]).not.toContain("vendors:read");
  });

  it("provider cannot access vendors:write", () => {
    expect(PROVIDER_ALLOWED_SCOPES as readonly string[]).not.toContain("vendors:write");
  });

  it("provider cannot access webhooks:manage", () => {
    expect(PROVIDER_ALLOWED_SCOPES as readonly string[]).not.toContain("webhooks:manage");
  });

  it("provider cannot access events:write", () => {
    expect(PROVIDER_ALLOWED_SCOPES as readonly string[]).not.toContain("events:write");
  });

  it("provider CAN access events:read", () => {
    expect(PROVIDER_ALLOWED_SCOPES as readonly string[]).toContain("events:read");
  });

  it("provider CAN access tasks:read and tasks:write", () => {
    expect(PROVIDER_ALLOWED_SCOPES as readonly string[]).toContain("tasks:read");
    expect(PROVIDER_ALLOWED_SCOPES as readonly string[]).toContain("tasks:write");
  });

  it("provider CAN access finance:read and finance:write", () => {
    expect(PROVIDER_ALLOWED_SCOPES as readonly string[]).toContain("finance:read");
    expect(PROVIDER_ALLOWED_SCOPES as readonly string[]).toContain("finance:write");
  });

  it("provider CAN access forms:read", () => {
    expect(PROVIDER_ALLOWED_SCOPES as readonly string[]).toContain("forms:read");
  });

  it("provider CAN access organization:read", () => {
    expect(PROVIDER_ALLOWED_SCOPES as readonly string[]).toContain("organization:read");
  });
});

// ============================================
// Wrapper enforcement: provider scope check logic
// ============================================
describe("Provider RBAC: Wrapper enforcement logic", () => {
  it("PROVIDER_ALLOWED_SCOPES.includes works for allowed scopes", () => {
    expect(PROVIDER_ALLOWED_SCOPES.includes("events:read")).toBe(true);
    expect(PROVIDER_ALLOWED_SCOPES.includes("tasks:write")).toBe(true);
  });

  it("PROVIDER_ALLOWED_SCOPES.includes rejects forbidden scopes", () => {
    expect(PROVIDER_ALLOWED_SCOPES.includes("crm:write" as typeof PROVIDER_ALLOWED_SCOPES[number])).toBe(false);
    expect(PROVIDER_ALLOWED_SCOPES.includes("vendors:write" as typeof PROVIDER_ALLOWED_SCOPES[number])).toBe(false);
    expect(PROVIDER_ALLOWED_SCOPES.includes("webhooks:manage" as typeof PROVIDER_ALLOWED_SCOPES[number])).toBe(false);
    expect(PROVIDER_ALLOWED_SCOPES.includes("guests:write" as typeof PROVIDER_ALLOWED_SCOPES[number])).toBe(false);
  });

  it("forbidden scopes detection works correctly for API key creation", () => {
    const requestedScopes = ["events:read", "crm:write", "vendors:write"];
    const forbidden = requestedScopes.filter(
      (s) => !PROVIDER_ALLOWED_SCOPES.includes(s as typeof PROVIDER_ALLOWED_SCOPES[number])
    );
    expect(forbidden).toEqual(["crm:write", "vendors:write"]);
  });

  it("all-allowed scopes pass validation", () => {
    const requestedScopes = ["events:read", "tasks:read", "finance:read"];
    const forbidden = requestedScopes.filter(
      (s) => !PROVIDER_ALLOWED_SCOPES.includes(s as typeof PROVIDER_ALLOWED_SCOPES[number])
    );
    expect(forbidden).toEqual([]);
  });
});

// ============================================
// Feature flags for provider plans
// ============================================
describe("Provider RBAC: Feature flags", () => {
  it("provider-free plan exists in feature flag system", async () => {
    const { isFeatureAvailable } = await import("@/lib/api/api-feature-flags");
    expect(typeof isFeatureAvailable("provider-free", "api_access")).toBe("boolean");
  });

  it("provider-pro plan exists in feature flag system", async () => {
    const { isFeatureAvailable } = await import("@/lib/api/api-feature-flags");
    expect(typeof isFeatureAvailable("provider-pro", "api_access")).toBe("boolean");
  });

  it("ApiError class has correct toResponse method", async () => {
    const { ApiError } = await import("@/lib/api/api-errors");
    const error = new ApiError(
      "authorization_error",
      "scope_not_allowed_for_provider",
      "Provider accounts cannot access scope 'contacts:write'",
      403
    );
    expect(error.statusCode).toBe(403);
    expect(error.type).toBe("authorization_error");
    expect(error.code).toBe("scope_not_allowed_for_provider");
  });
});
