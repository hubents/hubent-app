import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {},
}));
vi.mock("@/db/schema", () => new Proxy({}, { get: () => ({}) }));

import {
  isFeatureAvailable,
  getAvailableFeatures,
  API_FEATURE_FLAGS,
} from "@/lib/api/api-feature-flags";
import { generateOpenApiSpec } from "@/lib/api/openapi-spec";
import { WEBHOOK_EVENT_TYPES } from "@/lib/api/api-webhooks";
import { MCP_TOOLS, MCP_RESOURCES, MCP_TOOL_MAPPINGS } from "@/lib/api/mcp-server";
import { ALL_SCOPES } from "@/lib/api/api-auth";

// ============================================
// G1: Feature Flags Enforcement
// ============================================
describe("G1: Feature Flags in wrapper", () => {
  it("starter plan cannot access webhooks", () => {
    expect(isFeatureAvailable("starter", "webhooks")).toBe(false);
  });

  it("standard plan can access webhooks", () => {
    expect(isFeatureAvailable("standard", "webhooks")).toBe(true);
  });

  it("starter plan cannot access mcp_server", () => {
    expect(isFeatureAvailable("starter", "mcp_server")).toBe(false);
  });

  it("agency plan can access mcp_server", () => {
    expect(isFeatureAvailable("agency", "mcp_server")).toBe(true);
  });

  it("webhooks feature flag exists in definitions", () => {
    const webhookFlag = API_FEATURE_FLAGS.find((f) => f.key === "webhooks");
    expect(webhookFlag).toBeDefined();
    expect(webhookFlag!.requiredPlan).not.toBe("starter");
  });

  it("mcp_server feature flag exists in definitions", () => {
    const mcpFlag = API_FEATURE_FLAGS.find((f) => f.key === "mcp_server");
    expect(mcpFlag).toBeDefined();
  });

  it("featureNotAvailableError export exists in api-errors", async () => {
    const mod = await import("@/lib/api/api-errors");
    expect(typeof mod.featureNotAvailableError).toBe("function");
  });
});

// ============================================
// G2: Webhook dispatch completeness
// ============================================
describe("G2: Webhook event types are comprehensive", () => {
  const requiredEventTypes = [
    "event.created", "event.updated", "event.deleted", "event.status_changed",
    "contact.created", "contact.updated", "contact.deleted",
    "guest.created", "guest.updated", "guest.deleted",
    "task.created", "task.updated", "task.completed", "task.deleted",
    "lead.created", "lead.updated", "lead.deleted", "lead.stage_changed",
    "finance.document_created", "finance.document_updated", "finance.document_status_changed",
    "finance.payment_created",
    "form.submission_created", "form.updated",
    "vendor.created", "vendor.updated", "vendor.deleted",
  ];

  for (const eventType of requiredEventTypes) {
    it(`event type '${eventType}' is defined`, () => {
      expect(WEBHOOK_EVENT_TYPES).toContain(eventType);
    });
  }

  it("dispatchWebhookEvent is exported from api-webhooks", async () => {
    const mod = await import("@/lib/api/api-webhooks");
    expect(typeof mod.dispatchWebhookEvent).toBe("function");
  });
});

// ============================================
// G3: MCP completeness
// ============================================
describe("G3: MCP server is complete", () => {
  it("MCP_TOOLS is a non-empty array", () => {
    expect(Array.isArray(MCP_TOOLS)).toBe(true);
    expect(MCP_TOOLS.length).toBeGreaterThan(0);
  });

  it("MCP_RESOURCES has at least 3 resources", () => {
    expect(MCP_RESOURCES.length).toBeGreaterThanOrEqual(3);
  });

  it("every tool has a mapping", () => {
    for (const tool of MCP_TOOLS) {
      expect(MCP_TOOL_MAPPINGS[tool.name]).toBeDefined();
    }
  });

  it("every mapping has a valid method", () => {
    for (const [name, mapping] of Object.entries(MCP_TOOL_MAPPINGS)) {
      expect(["GET", "POST", "PATCH", "PUT", "DELETE"]).toContain(mapping.method);
    }
  });

  it("MCP resources include openapi-spec", () => {
    const specResource = MCP_RESOURCES.find((r) => r.uri === "hubents://openapi-spec");
    expect(specResource).toBeDefined();
  });

  it("MCP resources include webhook-events", () => {
    const webhookResource = MCP_RESOURCES.find((r) => r.uri === "hubents://webhook-events");
    expect(webhookResource).toBeDefined();
  });

  it("MCP resources include api-scopes", () => {
    const scopesResource = MCP_RESOURCES.find((r) => r.uri === "hubents://api-scopes");
    expect(scopesResource).toBeDefined();
  });
});

// ============================================
// G4: Cron cleanup route exists
// ============================================
describe("G4: API cleanup cron", () => {
  it("cleanupExpiredIdempotencyKeys is exported", async () => {
    const mod = await import("@/lib/api/api-idempotency");
    expect(typeof mod.cleanupExpiredIdempotencyKeys).toBe("function");
  });
});

// ============================================
// G5: OpenAPI spec completeness
// ============================================
describe("G5: OpenAPI spec is complete", () => {
  const spec = generateOpenApiSpec();

  it("spec is OpenAPI 3.1", () => {
    expect(spec.openapi).toBe("3.1.0");
  });

  it("spec has security scheme", () => {
    expect(spec.components.securitySchemes).toBeDefined();
    expect(spec.components.securitySchemes.BearerAuth).toBeDefined();
  });

  const requiredPaths = [
    "/webhooks",
    "/webhooks/{id}",
    "/webhooks/{id}/rotate-secret",
    "/api-keys",
    "/health",
    "/mcp",
    "/mcp/execute",
    "/mcp/resources",
  ];

  for (const path of requiredPaths) {
    it(`path '${path}' exists in spec`, () => {
      expect((spec.paths as Record<string, unknown>)[path]).toBeDefined();
    });
  }

  const requiredSchemas = ["Webhook", "ApiKey", "WebhookLog"];

  for (const schema of requiredSchemas) {
    it(`schema '${schema}' exists in spec`, () => {
      expect((spec.components.schemas as Record<string, unknown>)[schema]).toBeDefined();
    });
  }

  const requiredTags = ["Webhooks", "API Keys", "MCP", "System"];

  for (const tag of requiredTags) {
    it(`tag '${tag}' exists in spec`, () => {
      expect(spec.tags.some((t: { name: string }) => t.name === tag)).toBe(true);
    });
  }

  it("spec has at least 30 paths total", () => {
    expect(Object.keys(spec.paths).length).toBeGreaterThanOrEqual(30);
  });
});

// ============================================
// Cross-cutting: API scopes are consistent
// ============================================
describe("Cross-cutting: Scopes consistency", () => {
  it("ALL_SCOPES has 19 scopes", () => {
    expect(ALL_SCOPES.length).toBe(19);
  });

  it("webhooks:manage scope exists", () => {
    expect(ALL_SCOPES).toContain("webhooks:manage");
  });

  it("all scope pairs have read and write", () => {
    const modules = ["events", "contacts", "tasks", "finance", "guests", "crm", "forms", "vendors"];
    for (const mod of modules) {
      expect(ALL_SCOPES).toContain(`${mod}:read`);
      expect(ALL_SCOPES).toContain(`${mod}:write`);
    }
  });
});
