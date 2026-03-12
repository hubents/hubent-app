import { describe, it, expect } from "vitest";
import { MCP_TOOLS, MCP_RESOURCES, MCP_TOOL_MAPPINGS, getMcpServerManifest, buildMcpToolCall } from "@/lib/api/mcp-server";

describe("MCP Server Manifest", () => {
  const manifest = getMcpServerManifest();

  it("has correct server info", () => {
    expect(manifest.name).toBe("hubents");
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.description).toBeTruthy();
  });

  it("has tools and resources", () => {
    expect(manifest.tools.length).toBeGreaterThan(0);
    expect(manifest.resources.length).toBeGreaterThan(0);
  });
});

describe("MCP Tools", () => {
  it("has at least 18 tools", () => {
    expect(MCP_TOOLS.length).toBeGreaterThanOrEqual(18);
  });

  it("all tools have valid structure", () => {
    for (const tool of MCP_TOOLS) {
      expect(tool.name).toMatch(/^hubents_/);
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.properties).toBeDefined();
    }
  });

  it("covers all major resources", () => {
    const toolNames = MCP_TOOLS.map((t) => t.name);
    expect(toolNames).toContain("hubents_list_events");
    expect(toolNames).toContain("hubents_get_event");
    expect(toolNames).toContain("hubents_create_event");
    expect(toolNames).toContain("hubents_list_contacts");
    expect(toolNames).toContain("hubents_create_contact");
    expect(toolNames).toContain("hubents_list_tasks");
    expect(toolNames).toContain("hubents_create_task");
    expect(toolNames).toContain("hubents_list_guests");
    expect(toolNames).toContain("hubents_add_guest");
    expect(toolNames).toContain("hubents_get_guest_stats");
    expect(toolNames).toContain("hubents_list_leads");
    expect(toolNames).toContain("hubents_create_lead");
    expect(toolNames).toContain("hubents_get_pipeline");
    expect(toolNames).toContain("hubents_list_documents");
    expect(toolNames).toContain("hubents_get_finance_dashboard");
    expect(toolNames).toContain("hubents_list_forms");
    expect(toolNames).toContain("hubents_get_me");
  });

  it("all tools with required fields specify them", () => {
    const toolsWithRequired = MCP_TOOLS.filter((t) => t.inputSchema.required);
    for (const tool of toolsWithRequired) {
      for (const req of tool.inputSchema.required!) {
        expect(tool.inputSchema.properties).toHaveProperty(req);
      }
    }
  });
});

describe("MCP Resources", () => {
  it("has OpenAPI spec resource", () => {
    const openapi = MCP_RESOURCES.find((r) => r.uri === "hubents://openapi-spec");
    expect(openapi).toBeDefined();
    expect(openapi!.mimeType).toBe("application/json");
  });

  it("has webhook events resource", () => {
    const wh = MCP_RESOURCES.find((r) => r.uri === "hubents://webhook-events");
    expect(wh).toBeDefined();
  });

  it("has API scopes resource", () => {
    const scopes = MCP_RESOURCES.find((r) => r.uri === "hubents://api-scopes");
    expect(scopes).toBeDefined();
  });
});

describe("MCP Tool Mappings", () => {
  it("every tool has a mapping", () => {
    for (const tool of MCP_TOOLS) {
      expect(MCP_TOOL_MAPPINGS).toHaveProperty(tool.name);
    }
  });

  it("all mappings have valid HTTP methods", () => {
    for (const [, mapping] of Object.entries(MCP_TOOL_MAPPINGS)) {
      expect(["GET", "POST", "PATCH", "DELETE"]).toContain(mapping.method);
    }
  });

  it("all paths start with /api/v1 or are functions", () => {
    for (const [, mapping] of Object.entries(MCP_TOOL_MAPPINGS)) {
      if (typeof mapping.path === "string") {
        expect(mapping.path).toMatch(/^\/api\/v1\//);
      } else {
        expect(typeof mapping.path).toBe("function");
      }
    }
  });
});

describe("buildMcpToolCall", () => {
  const baseUrl = "https://app.hubents.com";
  const apiKey = "hb_live_test123";

  it("builds GET request with query params", () => {
    const call = buildMcpToolCall("hubents_list_events", { status: "confirmed", limit: 10 }, baseUrl, apiKey);
    expect(call).not.toBeNull();
    expect(call!.method).toBe("GET");
    expect(call!.url).toContain("/api/v1/events");
    expect(call!.url).toContain("status=confirmed");
    expect(call!.url).toContain("limit=10");
    expect(call!.headers.Authorization).toBe(`Bearer ${apiKey}`);
    expect(call!.body).toBeUndefined();
  });

  it("builds POST request with body", () => {
    const call = buildMcpToolCall("hubents_create_event", { name: "Wedding", type: "wedding" }, baseUrl, apiKey);
    expect(call).not.toBeNull();
    expect(call!.method).toBe("POST");
    expect(call!.url).toContain("/api/v1/events");
    expect(call!.body).toBeTruthy();
    const body = JSON.parse(call!.body!);
    expect(body.name).toBe("Wedding");
    expect(body.type).toBe("wedding");
  });

  it("builds dynamic path with params", () => {
    const call = buildMcpToolCall("hubents_get_event", { id: 42 }, baseUrl, apiKey);
    expect(call).not.toBeNull();
    expect(call!.url).toContain("/api/v1/events/42");
  });

  it("builds guest list with event_id in path", () => {
    const call = buildMcpToolCall("hubents_list_guests", { event_id: 5, limit: 50 }, baseUrl, apiKey);
    expect(call).not.toBeNull();
    expect(call!.url).toContain("/api/v1/events/5/guests");
    expect(call!.url).toContain("limit=50");
  });

  it("returns null for unknown tool", () => {
    const call = buildMcpToolCall("unknown_tool", {}, baseUrl, apiKey);
    expect(call).toBeNull();
  });

  it("includes version header", () => {
    const call = buildMcpToolCall("hubents_get_me", {}, baseUrl, apiKey);
    expect(call!.headers["X-HubEnts-Version"]).toBe("2025-01-01");
  });
});
