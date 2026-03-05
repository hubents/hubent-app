/**
 * Tests for Event Schedule validation schemas and helper logic.
 * Pure logic tests — no DB access required.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

// Replicate schemas from schedule/route.ts for testing
const createSchema = z.object({
  title: z.string().min(1, "title is required").max(500),
  date: z.string().min(1, "date is required"),
  description: z.string().max(2000).nullish(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm").nullish(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm").nullish(),
  location: z.string().max(500).nullish(),
  notes: z.string().max(2000).nullish(),
  color: z.string().max(20).nullish(),
  sortOrder: z.number().int().min(0).optional(),
});

const updateSchema = z.object({
  scheduleItemId: z.number().int().positive(),
  title: z.string().min(1).max(500).optional(),
  date: z.string().min(1).optional(),
  description: z.string().max(2000).nullish(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  location: z.string().max(500).nullish(),
  notes: z.string().max(2000).nullish(),
  color: z.string().max(20).nullish(),
  sortOrder: z.number().int().min(0).optional(),
});

function parseEventId(str: string): number | null {
  const n = parseInt(str, 10);
  return isNaN(n) ? null : n;
}

describe("Schedule Create Schema", () => {
  it("accepts valid minimal input", () => {
    const result = createSchema.safeParse({ title: "Apertura", date: "2026-03-15" });
    expect(result.success).toBe(true);
  });

  it("accepts valid full input", () => {
    const result = createSchema.safeParse({
      title: "Ceremonia",
      date: "2026-06-20",
      description: "Ceremonia principal",
      startTime: "18:00",
      endTime: "19:30",
      location: "Salón principal",
      notes: "Preparar audio",
      color: "#3b82f6",
      sortOrder: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createSchema.safeParse({ title: "", date: "2026-03-15" });
    expect(result.success).toBe(false);
  });

  it("rejects missing date", () => {
    const result = createSchema.safeParse({ title: "Test" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid startTime format", () => {
    const result = createSchema.safeParse({ title: "Test", date: "2026-03-15", startTime: "8pm" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid startTime format (single digit)", () => {
    const result = createSchema.safeParse({ title: "Test", date: "2026-03-15", startTime: "8:00" });
    expect(result.success).toBe(false);
  });

  it("accepts null startTime", () => {
    const result = createSchema.safeParse({ title: "Test", date: "2026-03-15", startTime: null });
    expect(result.success).toBe(true);
  });

  it("accepts undefined startTime", () => {
    const result = createSchema.safeParse({ title: "Test", date: "2026-03-15" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startTime).toBeUndefined();
    }
  });

  it("rejects title over 500 chars", () => {
    const result = createSchema.safeParse({ title: "A".repeat(501), date: "2026-03-15" });
    expect(result.success).toBe(false);
  });

  it("rejects description over 2000 chars", () => {
    const result = createSchema.safeParse({
      title: "Test",
      date: "2026-03-15",
      description: "A".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative sortOrder", () => {
    const result = createSchema.safeParse({ title: "Test", date: "2026-03-15", sortOrder: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects float sortOrder", () => {
    const result = createSchema.safeParse({ title: "Test", date: "2026-03-15", sortOrder: 1.5 });
    expect(result.success).toBe(false);
  });

  it("rejects extra fields (strips them)", () => {
    const result = createSchema.safeParse({
      title: "Test",
      date: "2026-03-15",
      organizationId: 999,
      eventId: 888,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).organizationId).toBeUndefined();
      expect((result.data as Record<string, unknown>).eventId).toBeUndefined();
    }
  });
});

describe("Schedule Update Schema", () => {
  it("requires scheduleItemId", () => {
    const result = updateSchema.safeParse({ title: "Updated" });
    expect(result.success).toBe(false);
  });

  it("rejects scheduleItemId = 0", () => {
    const result = updateSchema.safeParse({ scheduleItemId: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative scheduleItemId", () => {
    const result = updateSchema.safeParse({ scheduleItemId: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts valid partial update (title only)", () => {
    const result = updateSchema.safeParse({ scheduleItemId: 1, title: "Nuevo título" });
    expect(result.success).toBe(true);
  });

  it("accepts scheduleItemId-only (no fields to update)", () => {
    const result = updateSchema.safeParse({ scheduleItemId: 5 });
    expect(result.success).toBe(true);
  });

  it("accepts null fields (to clear them)", () => {
    const result = updateSchema.safeParse({
      scheduleItemId: 1,
      description: null,
      startTime: null,
      endTime: null,
      location: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid time format on update", () => {
    const result = updateSchema.safeParse({ scheduleItemId: 1, startTime: "noon" });
    expect(result.success).toBe(false);
  });

  it("strips unknown fields (mass assignment protection)", () => {
    const result = updateSchema.safeParse({
      scheduleItemId: 1,
      title: "Safe",
      organizationId: 999,
      eventId: 888,
      id: 777,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).organizationId).toBeUndefined();
      expect((result.data as Record<string, unknown>).eventId).toBeUndefined();
      expect((result.data as Record<string, unknown>).id).toBeUndefined();
    }
  });
});

describe("parseEventId", () => {
  it("parses valid integer", () => {
    expect(parseEventId("42")).toBe(42);
  });

  it("returns null for non-numeric", () => {
    expect(parseEventId("abc")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseEventId("")).toBeNull();
  });

  it("parses string with trailing text (parseInt behavior)", () => {
    expect(parseEventId("42abc")).toBe(42);
  });

  it("returns null for NaN-producing input", () => {
    expect(parseEventId("NaN")).toBeNull();
  });
});
