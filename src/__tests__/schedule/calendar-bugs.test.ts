/**
 * Tests for Calendar bug fixes:
 * - Bug 1: getDateKey timezone safety
 * - Bug 2: Date-only strings from API
 * - Bug 3: visibleTypes filtering
 */
import { describe, it, expect } from "vitest";
import { getDateKey, getMonthRange, getCalendarWeeks, groupItemsByDate } from "@/lib/calendar";
import type { CalendarItem, CalendarItemType } from "@/lib/calendar";

describe("getDateKey — timezone-safe", () => {
  it("handles YYYY-MM-DD strings (date-only from API)", () => {
    expect(getDateKey("2026-03-15")).toBe("2026-03-15");
    expect(getDateKey("2026-01-01")).toBe("2026-01-01");
    expect(getDateKey("2026-12-31")).toBe("2026-12-31");
  });

  it("handles ISO UTC strings by extracting date portion", () => {
    expect(getDateKey("2026-03-15T00:00:00.000Z")).toBe("2026-03-15");
    expect(getDateKey("2026-03-15T23:59:59.999Z")).toBe("2026-03-15");
    expect(getDateKey("2026-03-15T03:00:00.000Z")).toBe("2026-03-15");
  });

  it("handles ISO strings with timezone offset", () => {
    expect(getDateKey("2026-03-15T00:00:00-03:00")).toBe("2026-03-15");
    expect(getDateKey("2026-03-15T00:00:00+05:30")).toBe("2026-03-15");
  });

  it("handles local Date objects using local date parts", () => {
    const date = new Date(2026, 2, 15); // March 15, 2026 local
    expect(getDateKey(date)).toBe("2026-03-15");
  });

  it("pads single-digit months and days", () => {
    const jan1 = new Date(2026, 0, 1); // January 1
    expect(getDateKey(jan1)).toBe("2026-01-01");

    const sep9 = new Date(2026, 8, 9); // September 9
    expect(getDateKey(sep9)).toBe("2026-09-09");
  });
});

describe("getMonthRange — produces valid date ranges", () => {
  it("March 2026 range extends ±7 days", () => {
    const { from, to } = getMonthRange(2026, 3);
    // March 1 - 7 = Feb 22, March 31 + 7 = Apr 7
    expect(from).toBe("2026-02-22");
    expect(to).toBe("2026-04-07");
  });

  it("January 2026 wraps to previous year", () => {
    const { from, to } = getMonthRange(2026, 1);
    expect(from).toMatch(/^2025-12-/);
    expect(to).toMatch(/^2026-02-/);
  });
});

describe("getCalendarWeeks — local dates", () => {
  it("returns 6 weeks of 7 days each", () => {
    const weeks = getCalendarWeeks(2026, 3);
    expect(weeks).toHaveLength(6);
    weeks.forEach((week) => {
      expect(week).toHaveLength(7);
    });
  });

  it("all dates produce valid dateKeys", () => {
    const weeks = getCalendarWeeks(2026, 3);
    for (const week of weeks) {
      for (const date of week) {
        const key = getDateKey(date);
        expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});

describe("groupItemsByDate — matches grid dateKeys", () => {
  it("date-only strings group correctly with calendar grid", () => {
    const items: CalendarItem[] = [
      {
        id: "event-1",
        type: "event",
        title: "Boda",
        date: "2026-03-15",
        color: "bg-blue-500",
        href: "/dashboard/events/1",
      },
      {
        id: "task-1",
        type: "task",
        title: "Caterer",
        date: "2026-03-15",
        color: "bg-green-500",
        href: "/dashboard/tasks?taskId=1",
      },
      {
        id: "task-2",
        type: "task",
        title: "Flores",
        date: "2026-03-16",
        color: "bg-green-500",
        href: "/dashboard/tasks?taskId=2",
      },
    ];

    const grouped = groupItemsByDate(items);
    expect(grouped.get("2026-03-15")).toHaveLength(2);
    expect(grouped.get("2026-03-16")).toHaveLength(1);

    // Verify grid date for March 15 produces matching key
    const gridDate = new Date(2026, 2, 15);
    const gridKey = getDateKey(gridDate);
    expect(gridKey).toBe("2026-03-15");
    expect(grouped.get(gridKey)).toHaveLength(2);
  });
});

describe("visibleTypes filtering logic", () => {
  const ALL_TYPES: CalendarItemType[] = [
    "event", "task", "meeting", "payment", "task_payment", "document", "lead", "schedule",
  ];

  function filterByVisibleTypes(
    apiTypes: CalendarItemType[],
    visibleTypes: CalendarItemType[] | undefined
  ): CalendarItemType[] {
    if (!visibleTypes) return apiTypes;
    return apiTypes.filter((t) => visibleTypes.includes(t));
  }

  it("dashboard: only event + task from full API types", () => {
    const result = filterByVisibleTypes(ALL_TYPES, ["event", "task"]);
    expect(result).toEqual(["event", "task"]);
  });

  it("event cronograma: event + task + meeting", () => {
    const result = filterByVisibleTypes(ALL_TYPES, ["event", "task", "meeting"]);
    expect(result).toEqual(["event", "task", "meeting"]);
  });

  it("no visibleTypes = all API types pass through", () => {
    const result = filterByVisibleTypes(ALL_TYPES, undefined);
    expect(result).toEqual(ALL_TYPES);
  });

  it("API without lead still filters correctly", () => {
    const apiTypesNoLead = ALL_TYPES.filter((t) => t !== "lead");
    const result = filterByVisibleTypes(apiTypesNoLead, ["event", "task"]);
    expect(result).toEqual(["event", "task"]);
  });

  it("items are filtered by visibleTypes", () => {
    const items: CalendarItem[] = [
      { id: "e1", type: "event", title: "E", date: "2026-03-15", color: "", href: "" },
      { id: "t1", type: "task", title: "T", date: "2026-03-15", color: "", href: "" },
      { id: "m1", type: "meeting", title: "M", date: "2026-03-15", color: "", href: "" },
      { id: "p1", type: "payment", title: "P", date: "2026-03-15", color: "", href: "" },
    ];
    const visibleTypes: CalendarItemType[] = ["event", "task"];
    const filtered = items.filter((item) => visibleTypes.includes(item.type));
    expect(filtered).toHaveLength(2);
    expect(filtered.map((i) => i.type)).toEqual(["event", "task"]);
  });
});
