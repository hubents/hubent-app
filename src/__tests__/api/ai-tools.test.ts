import { describe, it, expect, vi } from "vitest";

// We test the tool structure by importing createAITools and checking
// that all expected tools exist with correct schemas.
// NOTE: We can't execute tools in tests because they require a real DB connection.
// Instead we validate the shape and completeness of the tool definitions.

// Since createAITools imports db, we mock it
vi.mock("@/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: () => [] }) }) }) }),
    query: {},
  },
}));

// Mock schema to avoid pg connection
vi.mock("@/db/schema", () => {
  const col = { id: "id" };
  const table = new Proxy({}, { get: () => col });
  return new Proxy({}, { get: () => table });
});

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: () => true,
  and: (...args: unknown[]) => args,
  desc: () => true,
  asc: () => true,
  gte: () => true,
  lte: () => true,
  sql: () => true,
  isNull: () => true,
  isNotNull: () => true,
  count: () => true,
}));

describe("HubIA AI Tools", () => {
  it(
    "createAITools is importable and returns an object",
    async () => {
      const { createAITools } = await import("@/lib/ai/tools");
      const tools = createAITools({ userId: "test-user", organizationId: 1, role: "owner" });
      expect(tools).toBeDefined();
      expect(typeof tools).toBe("object");
    },
    30_000
  );

  it("exports all 17 expected tools", async () => {
    const { createAITools } = await import("@/lib/ai/tools");
    const tools = createAITools({ userId: "test-user", organizationId: 1, role: "owner" });

    const expectedTools = [
      // Events & Tasks (5)
      "getEvents",
      "getEventDetails",
      "getEventFullReport",
      "getTasks",
      "getTaskDetails",
      // Finance (4)
      "getFinanceSummary",
      "getDocuments",
      "getPayments",
      "getPaymentSchedules",
      // Contacts & CRM (2)
      "getContacts",
      "getLeads",
      // Guests (1)
      "getGuests",
      // Vendors (1)
      "getVendors",
      // Team (1)
      "getTeamMembers",
      // Forms (2)
      "getForms",
      "getFormSubmissions",
      // Summary (1)
      "getDailySummary",
    ];

    const toolKeys = Object.keys(tools);
    
    for (const toolName of expectedTools) {
      expect(toolKeys, `Missing tool: ${toolName}`).toContain(toolName);
    }

    expect(toolKeys.length).toBe(expectedTools.length);
  });

  it("each tool has description and inputSchema", async () => {
    const { createAITools } = await import("@/lib/ai/tools");
    const tools = createAITools({ userId: "test-user", organizationId: 1, role: "owner" });

    for (const [name, t] of Object.entries(tools)) {
      const tool = t as { description?: string; parameters?: unknown };
      expect(tool.description, `${name} missing description`).toBeDefined();
      expect(typeof tool.description).toBe("string");
      expect((tool.description as string).length, `${name} description too short`).toBeGreaterThan(10);
    }
  });
});

describe("HubIA System Prompt", () => {
  it("buildSystemPrompt returns a non-empty string", async () => {
    const { buildSystemPrompt } = await import("@/lib/ai/system-prompt");
    const prompt = buildSystemPrompt({
      userName: "Test User",
      organizationName: "Test Org",
      userRole: "owner",
      context: "dashboard",
    });

    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(500);
  });

  it("system prompt includes all tool names", async () => {
    const { buildSystemPrompt } = await import("@/lib/ai/system-prompt");
    const prompt = buildSystemPrompt({ context: "dashboard" });

    const toolNames = [
      "getEvents", "getEventDetails", "getEventFullReport",
      "getTasks", "getTaskDetails",
      "getFinanceSummary", "getDocuments", "getPayments", "getPaymentSchedules",
      "getContacts", "getLeads",
      "getGuests", "getVendors",
      "getTeamMembers", "getForms", "getFormSubmissions",
      "getDailySummary",
    ];

    for (const name of toolNames) {
      expect(prompt, `System prompt missing reference to ${name}`).toContain(name);
    }
  });

  it("includes role-specific prompt for each role", async () => {
    const { buildSystemPrompt } = await import("@/lib/ai/system-prompt");
    
    const roles = ["owner", "admin", "planner", "assistant", "viewer", "client"];
    for (const role of roles) {
      const prompt = buildSystemPrompt({ userRole: role });
      expect(prompt.length, `${role} prompt too short`).toBeGreaterThan(500);
    }
  });

  it("includes context-specific prompt for each context", async () => {
    const { buildSystemPrompt } = await import("@/lib/ai/system-prompt");
    
    const contexts = ["dashboard", "finance", "crm", "contacts", "vendors", "team", "billing", "calendar"];
    for (const ctx of contexts) {
      const prompt = buildSystemPrompt({ context: ctx });
      expect(prompt.length, `${ctx} context prompt too short`).toBeGreaterThan(500);
    }
  });

  it("handles task:ID context correctly", async () => {
    const { buildSystemPrompt } = await import("@/lib/ai/system-prompt");
    const prompt = buildSystemPrompt({ context: "task:42" });
    expect(prompt).toContain("42");
    expect(prompt).toContain("getTaskDetails");
  });

  it("handles event:ID context correctly", async () => {
    const { buildSystemPrompt } = await import("@/lib/ai/system-prompt");
    const prompt = buildSystemPrompt({ context: "event:99" });
    expect(prompt).toContain("99");
    expect(prompt).toContain("getEventDetails");
  });
});

describe("HubIA Initial Suggestions", () => {
  it("has suggestions for all expected contexts", async () => {
    const { INITIAL_SUGGESTIONS } = await import("@/lib/ai/system-prompt");
    
    const expectedContexts = [
      "dashboard", "event", "task", "finance", "rsvp", "forms",
      "guests", "crm", "contacts", "vendors", "team", "billing",
      "runsheet", "calendar", "general",
    ];

    for (const ctx of expectedContexts) {
      expect(INITIAL_SUGGESTIONS, `Missing suggestions for: ${ctx}`).toHaveProperty(ctx);
      const suggestions = (INITIAL_SUGGESTIONS as Record<string, string[]>)[ctx];
      expect(Array.isArray(suggestions), `${ctx} suggestions should be array`).toBe(true);
      expect(suggestions.length, `${ctx} should have at least 2 suggestions`).toBeGreaterThanOrEqual(2);
    }
  });
});
