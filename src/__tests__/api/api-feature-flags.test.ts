import { describe, it, expect } from "vitest";
import {
  API_FEATURE_FLAGS,
  isFeatureAvailable,
  getAvailableFeatures,
  getApiKeyLimit,
  getDefaultRateLimit,
} from "@/lib/api/api-feature-flags";

describe("API Feature Flags", () => {
  it("has at least 5 feature flags", () => {
    expect(API_FEATURE_FLAGS.length).toBeGreaterThanOrEqual(5);
  });

  it("all flags have required structure", () => {
    for (const flag of API_FEATURE_FLAGS) {
      expect(flag.key).toBeTruthy();
      expect(flag.name).toBeTruthy();
      expect(flag.description).toBeTruthy();
      expect(flag.requiredPlan).toBeTruthy();
    }
  });

  it("has api_access as base feature", () => {
    const apiAccess = API_FEATURE_FLAGS.find((f) => f.key === "api_access");
    expect(apiAccess).toBeDefined();
    expect(apiAccess!.requiredPlan).toBe("starter");
  });

  it("has webhooks as standard feature", () => {
    const wh = API_FEATURE_FLAGS.find((f) => f.key === "webhooks");
    expect(wh).toBeDefined();
    expect(wh!.requiredPlan).toBe("standard");
  });
});

describe("isFeatureAvailable", () => {
  it("starter has api_access", () => {
    expect(isFeatureAvailable("starter", "api_access")).toBe(true);
  });

  it("starter does NOT have webhooks", () => {
    expect(isFeatureAvailable("starter", "webhooks")).toBe(false);
  });

  it("standard has webhooks", () => {
    expect(isFeatureAvailable("standard", "webhooks")).toBe(true);
  });

  it("standard has mcp_server", () => {
    expect(isFeatureAvailable("standard", "mcp_server")).toBe(true);
  });

  it("agency has all features", () => {
    for (const flag of API_FEATURE_FLAGS.filter((f) => f.requiredPlan !== "provider-pro")) {
      expect(isFeatureAvailable("agency", flag.key)).toBe(true);
    }
  });

  it("returns false for unknown feature", () => {
    expect(isFeatureAvailable("agency", "nonexistent")).toBe(false);
  });

  it("provider-free has minimal features", () => {
    const features = getAvailableFeatures("provider-free");
    expect(features.length).toBeLessThan(API_FEATURE_FLAGS.length);
  });

  it("provider-pro has provider_api", () => {
    expect(isFeatureAvailable("provider-pro", "provider_api")).toBe(true);
  });
});

describe("getApiKeyLimit", () => {
  it("starter gets 2 keys", () => {
    expect(getApiKeyLimit("starter")).toBe(2);
  });

  it("standard gets 5 keys", () => {
    expect(getApiKeyLimit("standard")).toBe(5);
  });

  it("agency gets 20 keys", () => {
    expect(getApiKeyLimit("agency")).toBe(20);
  });

  it("provider-free gets 1 key", () => {
    expect(getApiKeyLimit("provider-free")).toBe(1);
  });

  it("unknown plan gets default 2", () => {
    expect(getApiKeyLimit("unknown")).toBe(2);
  });
});

describe("getDefaultRateLimit", () => {
  it("starter gets 100/min", () => {
    expect(getDefaultRateLimit("starter")).toBe(100);
  });

  it("standard gets 200/min", () => {
    expect(getDefaultRateLimit("standard")).toBe(200);
  });

  it("agency gets 500/min", () => {
    expect(getDefaultRateLimit("agency")).toBe(500);
  });

  it("provider-free gets 50/min", () => {
    expect(getDefaultRateLimit("provider-free")).toBe(50);
  });

  it("rate limits increase with plan tier", () => {
    const free = getDefaultRateLimit("provider-free");
    const starter = getDefaultRateLimit("starter");
    const standard = getDefaultRateLimit("standard");
    const agency = getDefaultRateLimit("agency");
    expect(free).toBeLessThan(starter);
    expect(starter).toBeLessThan(standard);
    expect(standard).toBeLessThan(agency);
  });
});
