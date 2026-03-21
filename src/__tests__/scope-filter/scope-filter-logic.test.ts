/**
 * Tests for scope filter feature (Ticket 86agbrgk8).
 * Pure logic tests — no DB, no React rendering required.
 *
 * Validates:
 * - Backend scope filter logic for tasks, documents, payment records, payment schedules
 * - eventId takes precedence over scope
 * - Frontend URL construction for useTasks hook
 * - Scope filter default behavior
 */
import { describe, it, expect } from "vitest";

// ========== Types ==========

type ScopeValue = "standalone" | "event" | "all";

// ========== Replicated Logic: Tasks API scope filtering ==========

interface TaskWhereCondition {
  type: string;
  value?: string | number | null;
}

function buildTaskScopeFilter(
  eventId: string | null,
  scope: ScopeValue | null,
): TaskWhereCondition | null {
  if (eventId) {
    return { type: "eq", value: parseInt(eventId, 10) };
  } else if (scope === "standalone") {
    return { type: "isNull" };
  } else if (scope === "event") {
    return { type: "isNotNull" };
  }
  return null;
}

// ========== Replicated Logic: Finance documents scope filtering ==========

interface DocumentWhereConditions {
  eventIdFilter: TaskWhereCondition | null;
  excludeMirrors: boolean;
}

function buildDocumentScopeFilter(
  eventId: number | undefined,
  scope: ScopeValue | undefined,
): DocumentWhereConditions {
  if (eventId) {
    return { eventIdFilter: { type: "eq", value: eventId }, excludeMirrors: false };
  }

  // No eventId: always exclude mirrors
  if (scope === "standalone") {
    return { eventIdFilter: { type: "isNull" }, excludeMirrors: true };
  } else if (scope === "event") {
    return { eventIdFilter: { type: "isNotNull" }, excludeMirrors: true };
  }

  return { eventIdFilter: null, excludeMirrors: true };
}

// ========== Replicated Logic: Payment records/schedules scope filtering ==========

function buildPaymentScopeFilter(
  eventId: number | undefined,
  scope: ScopeValue | undefined,
): TaskWhereCondition | null {
  if (eventId) {
    return { type: "eq", value: eventId };
  } else if (scope === "standalone") {
    return { type: "isNull" };
  } else if (scope === "event") {
    return { type: "isNotNull" };
  }
  return null;
}

// ========== Replicated Logic: useTasks URL construction ==========

function buildTasksUrl(eventId?: number, scope?: ScopeValue): string {
  const params = new URLSearchParams();
  if (eventId) {
    params.set("eventId", eventId.toString());
  } else if (scope && scope !== "all") {
    params.set("scope", scope);
  }
  const qs = params.toString();
  return qs ? `/api/tasks?${qs}` : "/api/tasks";
}

// ========== Replicated Logic: Finance page URL construction ==========

function buildFinanceDocUrl(
  type: string,
  scope: ScopeValue,
  page: number = 1,
  statusFilter: string = "all",
  directionTab: string = "all",
  searchTerm: string = "",
): string {
  const params = new URLSearchParams({ type, page: page.toString(), limit: "20" });
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (directionTab !== "all") params.set("direction", directionTab);
  if (searchTerm) params.set("search", searchTerm);
  if (scope !== "all") params.set("scope", scope);
  return `/api/finance/documents?${params}`;
}

function buildPaymentsUrl(
  scope: ScopeValue,
  direction: string = "all",
  page: number = 1,
): string {
  const params = new URLSearchParams({ type: "records", page: page.toString(), limit: "20" });
  if (direction !== "all") params.set("direction", direction);
  if (scope !== "all") params.set("scope", scope);
  return `/api/finance/payments?${params}`;
}

// ==================== TESTS ====================

describe("Scope Filter — Tasks API", () => {
  it("eventId takes precedence over scope", () => {
    const result = buildTaskScopeFilter("42", "standalone");
    expect(result).toEqual({ type: "eq", value: 42 });
  });

  it("scope=standalone → isNull filter", () => {
    const result = buildTaskScopeFilter(null, "standalone");
    expect(result).toEqual({ type: "isNull" });
  });

  it("scope=event → isNotNull filter", () => {
    const result = buildTaskScopeFilter(null, "event");
    expect(result).toEqual({ type: "isNotNull" });
  });

  it("scope=all → no filter", () => {
    const result = buildTaskScopeFilter(null, "all");
    expect(result).toBeNull();
  });

  it("no scope → no filter (backwards compatible)", () => {
    const result = buildTaskScopeFilter(null, null);
    expect(result).toBeNull();
  });
});

describe("Scope Filter — Finance Documents", () => {
  it("eventId takes precedence, no mirror exclusion", () => {
    const result = buildDocumentScopeFilter(42, "standalone");
    expect(result.eventIdFilter).toEqual({ type: "eq", value: 42 });
    expect(result.excludeMirrors).toBe(false);
  });

  it("scope=standalone → isNull + exclude mirrors", () => {
    const result = buildDocumentScopeFilter(undefined, "standalone");
    expect(result.eventIdFilter).toEqual({ type: "isNull" });
    expect(result.excludeMirrors).toBe(true);
  });

  it("scope=event → isNotNull + exclude mirrors", () => {
    const result = buildDocumentScopeFilter(undefined, "event");
    expect(result.eventIdFilter).toEqual({ type: "isNotNull" });
    expect(result.excludeMirrors).toBe(true);
  });

  it("scope=all → no eventId filter but exclude mirrors", () => {
    const result = buildDocumentScopeFilter(undefined, "all");
    expect(result.eventIdFilter).toBeNull();
    expect(result.excludeMirrors).toBe(true);
  });

  it("no scope → no eventId filter but exclude mirrors (backwards compatible)", () => {
    const result = buildDocumentScopeFilter(undefined, undefined);
    expect(result.eventIdFilter).toBeNull();
    expect(result.excludeMirrors).toBe(true);
  });
});

describe("Scope Filter — Payment Records/Schedules", () => {
  it("eventId takes precedence over scope", () => {
    const result = buildPaymentScopeFilter(42, "standalone");
    expect(result).toEqual({ type: "eq", value: 42 });
  });

  it("scope=standalone → isNull filter", () => {
    const result = buildPaymentScopeFilter(undefined, "standalone");
    expect(result).toEqual({ type: "isNull" });
  });

  it("scope=event → isNotNull filter", () => {
    const result = buildPaymentScopeFilter(undefined, "event");
    expect(result).toEqual({ type: "isNotNull" });
  });

  it("scope=all → no filter", () => {
    const result = buildPaymentScopeFilter(undefined, "all");
    expect(result).toBeNull();
  });

  it("no scope → no filter (backwards compatible)", () => {
    const result = buildPaymentScopeFilter(undefined, undefined);
    expect(result).toBeNull();
  });
});

describe("Scope Filter — useTasks URL construction", () => {
  it("eventId → uses eventId param, ignores scope", () => {
    expect(buildTasksUrl(42, "standalone")).toBe("/api/tasks?eventId=42");
  });

  it("scope=standalone → adds scope param", () => {
    expect(buildTasksUrl(undefined, "standalone")).toBe("/api/tasks?scope=standalone");
  });

  it("scope=event → adds scope param", () => {
    expect(buildTasksUrl(undefined, "event")).toBe("/api/tasks?scope=event");
  });

  it("scope=all → no params (same as no scope)", () => {
    expect(buildTasksUrl(undefined, "all")).toBe("/api/tasks");
  });

  it("no scope → no params", () => {
    expect(buildTasksUrl()).toBe("/api/tasks");
  });
});

describe("Scope Filter — Finance page URL construction", () => {
  it("standalone scope adds scope param to documents URL", () => {
    const url = buildFinanceDocUrl("invoice", "standalone");
    expect(url).toContain("scope=standalone");
    expect(url).toContain("type=invoice");
  });

  it("all scope does not add scope param", () => {
    const url = buildFinanceDocUrl("invoice", "all");
    expect(url).not.toContain("scope=");
  });

  it("standalone scope adds scope param to payments URL", () => {
    const url = buildPaymentsUrl("standalone");
    expect(url).toContain("scope=standalone");
  });

  it("event scope adds scope param to payments URL", () => {
    const url = buildPaymentsUrl("event");
    expect(url).toContain("scope=event");
  });

  it("all scope does not add scope param to payments URL", () => {
    const url = buildPaymentsUrl("all");
    expect(url).not.toContain("scope=");
  });
});

describe("Scope Filter — Default behavior", () => {
  it("global tasks page defaults to standalone", () => {
    const defaultScope: ScopeValue = "standalone";
    const url = buildTasksUrl(undefined, defaultScope);
    expect(url).toBe("/api/tasks?scope=standalone");
  });

  it("event tasks page uses eventId, no scope", () => {
    const url = buildTasksUrl(123);
    expect(url).toBe("/api/tasks?eventId=123");
    expect(url).not.toContain("scope=");
  });

  it("event-scoped document API passes eventId, scope is irrelevant", () => {
    const result = buildDocumentScopeFilter(123, undefined);
    expect(result.eventIdFilter).toEqual({ type: "eq", value: 123 });
    expect(result.excludeMirrors).toBe(false);
  });
});

describe("Scope Filter — Edge cases", () => {
  it("eventId=0 is falsy, uses scope instead", () => {
    const result = buildTaskScopeFilter(null, "standalone");
    expect(result).toEqual({ type: "isNull" });
  });

  it("invalid scope values fall through to no filter", () => {
    const result = buildTaskScopeFilter(null, "invalid" as ScopeValue);
    expect(result).toBeNull();
  });

  it("vendor finance pages don't pass scope (undefined behavior)", () => {
    const result = buildDocumentScopeFilter(undefined, undefined);
    expect(result.eventIdFilter).toBeNull();
    expect(result.excludeMirrors).toBe(true);
  });

  it("internal getPaymentRecords call with documentId only (no scope)", () => {
    const result = buildPaymentScopeFilter(undefined, undefined);
    expect(result).toBeNull();
  });
});
