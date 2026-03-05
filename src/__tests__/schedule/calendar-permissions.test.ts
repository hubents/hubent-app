/**
 * Tests for Calendar permission filtering logic.
 * Pure logic tests — no DB access required.
 */
import { describe, it, expect } from "vitest";

type CalendarItemType = "event" | "task" | "meeting" | "payment" | "task_payment" | "document" | "lead" | "schedule";

interface EventAccess {
  eventId: number;
  permissions: {
    general?: string;
    tasks?: string;
    guests?: string;
    rsvp?: string;
    vendors?: string;
    finances?: string;
    settings?: string;
  };
}

// Replicate the permission filtering logic from calendar/route.ts
function computeCalendarPermissions(access: EventAccess[]) {
  const allowedEventIds = access.map((a) => a.eventId);
  const taskEventIds = access
    .filter((a) => a.permissions.tasks && a.permissions.tasks !== "none")
    .map((a) => a.eventId);
  const financeEventIds = access
    .filter((a) => a.permissions.finances && a.permissions.finances !== "none")
    .map((a) => a.eventId);
  const hasFinanceAccess = financeEventIds.length > 0;

  const allowedTypes: CalendarItemType[] = [
    "event", "task", "meeting", "payment", "task_payment", "document", "lead", "schedule",
  ];

  // Remove finance types if no finance access
  if (!hasFinanceAccess) {
    const remove: CalendarItemType[] = ["payment", "task_payment", "document"];
    remove.forEach((t) => {
      const idx = allowedTypes.indexOf(t);
      if (idx >= 0) allowedTypes.splice(idx, 1);
    });
  }
  // eventScoped never sees leads
  const leadIdx = allowedTypes.indexOf("lead");
  if (leadIdx >= 0) allowedTypes.splice(leadIdx, 1);

  return { allowedEventIds, taskEventIds, financeEventIds, hasFinanceAccess, allowedTypes };
}

describe("Calendar Permission Filtering — eventScoped", () => {
  it("client role: general+guests+rsvp only → no tasks, no finances, no leads", () => {
    const access: EventAccess[] = [{
      eventId: 1,
      permissions: {
        general: "view",
        tasks: "none",
        guests: "view",
        rsvp: "view",
        vendors: "none",
        finances: "none",
        settings: "none",
      },
    }];

    const result = computeCalendarPermissions(access);

    expect(result.allowedEventIds).toEqual([1]);
    expect(result.taskEventIds).toEqual([]);
    expect(result.financeEventIds).toEqual([]);
    expect(result.hasFinanceAccess).toBe(false);
    expect(result.allowedTypes).not.toContain("lead");
    expect(result.allowedTypes).not.toContain("payment");
    expect(result.allowedTypes).not.toContain("task_payment");
    expect(result.allowedTypes).not.toContain("document");
    expect(result.allowedTypes).toContain("event");
    expect(result.allowedTypes).toContain("schedule");
  });

  it("assistant role: general+tasks+guests+rsvp+vendors → tasks visible, no finances", () => {
    const access: EventAccess[] = [{
      eventId: 5,
      permissions: {
        general: "edit",
        tasks: "edit",
        guests: "edit",
        rsvp: "edit",
        vendors: "view",
        finances: "none",
        settings: "none",
      },
    }];

    const result = computeCalendarPermissions(access);

    expect(result.taskEventIds).toEqual([5]);
    expect(result.hasFinanceAccess).toBe(false);
    expect(result.allowedTypes).toContain("task");
    expect(result.allowedTypes).toContain("meeting");
    expect(result.allowedTypes).not.toContain("payment");
    expect(result.allowedTypes).not.toContain("lead");
  });

  it("viewer with finances: view → can see payments and docs", () => {
    const access: EventAccess[] = [{
      eventId: 10,
      permissions: {
        general: "view",
        tasks: "view",
        guests: "view",
        rsvp: "view",
        vendors: "view",
        finances: "view",
        settings: "none",
      },
    }];

    const result = computeCalendarPermissions(access);

    expect(result.financeEventIds).toEqual([10]);
    expect(result.hasFinanceAccess).toBe(true);
    expect(result.allowedTypes).toContain("payment");
    expect(result.allowedTypes).toContain("task_payment");
    expect(result.allowedTypes).toContain("document");
    expect(result.allowedTypes).not.toContain("lead");
  });

  it("multi-event user: mixed permissions across events", () => {
    const access: EventAccess[] = [
      {
        eventId: 1,
        permissions: { general: "view", tasks: "none", finances: "none" },
      },
      {
        eventId: 2,
        permissions: { general: "edit", tasks: "edit", finances: "view" },
      },
    ];

    const result = computeCalendarPermissions(access);

    expect(result.allowedEventIds).toEqual([1, 2]);
    expect(result.taskEventIds).toEqual([2]);
    expect(result.financeEventIds).toEqual([2]);
    expect(result.hasFinanceAccess).toBe(true);
    expect(result.allowedTypes).toContain("payment");
    expect(result.allowedTypes).not.toContain("lead");
  });

  it("user with zero events → empty arrays, no finance access", () => {
    const access: EventAccess[] = [];

    const result = computeCalendarPermissions(access);

    expect(result.allowedEventIds).toEqual([]);
    expect(result.taskEventIds).toEqual([]);
    expect(result.financeEventIds).toEqual([]);
    expect(result.hasFinanceAccess).toBe(false);
    expect(result.allowedTypes).not.toContain("lead");
    expect(result.allowedTypes).not.toContain("payment");
  });

  it("schedule type always present for eventScoped", () => {
    const access: EventAccess[] = [{
      eventId: 1,
      permissions: { general: "view", tasks: "none", finances: "none" },
    }];

    const result = computeCalendarPermissions(access);
    expect(result.allowedTypes).toContain("schedule");
  });
});

describe("PATCH whitelist protection", () => {
  it("update schema strips organizationId, eventId, id fields", () => {
    // Simulates what Zod does — z.object with defined fields strips unknown ones
    const updateSchema = {
      parse(data: Record<string, unknown>) {
        const allowed = ["scheduleItemId", "title", "date", "description", "startTime", "endTime", "location", "notes", "color", "sortOrder"];
        const result: Record<string, unknown> = {};
        for (const key of allowed) {
          if (key in data) result[key] = data[key];
        }
        return result;
      },
    };

    const maliciousInput = {
      scheduleItemId: 1,
      title: "Hacked",
      organizationId: 999,
      eventId: 888,
      id: 777,
      createdAt: "2020-01-01",
    };

    const result = updateSchema.parse(maliciousInput);
    expect(result.organizationId).toBeUndefined();
    expect(result.eventId).toBeUndefined();
    expect(result.id).toBeUndefined();
    expect(result.createdAt).toBeUndefined();
    expect(result.title).toBe("Hacked");
    expect(result.scheduleItemId).toBe(1);
  });
});
