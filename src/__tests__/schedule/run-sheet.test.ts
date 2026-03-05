/**
 * Tests for Run Sheet (Orden del día) consolidation logic.
 * Pure logic tests — no DB access required.
 */
import { describe, it, expect } from "vitest";

// ============================================
// Replicate timeline grouping logic from run-sheet page
// ============================================

interface ScheduleItem {
  id: number;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  source: "event" | "task";
  taskTitle: string | null;
  taskId: number | null;
}

function groupByDate(items: ScheduleItem[]): Record<string, ScheduleItem[]> {
  return items.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
    const dateKey = new Date(item.date).toISOString().split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});
}

function sortItemsByTime(items: ScheduleItem[]): ScheduleItem[] {
  return [...items].sort((a, b) => {
    const aTime = a.startTime || "99:99";
    const bTime = b.startTime || "99:99";
    return aTime.localeCompare(bTime);
  });
}

function getUniqueTasks(items: ScheduleItem[]): { id: number; title: string }[] {
  return items
    .filter((i) => i.source === "task" && i.taskId)
    .reduce<{ id: number; title: string }[]>((acc, item) => {
      if (!acc.find((t) => t.id === item.taskId)) {
        acc.push({ id: item.taskId!, title: item.taskTitle || `Tarea #${item.taskId}` });
      }
      return acc;
    }, []);
}

// ============================================
// Test data
// ============================================

const sampleItems: ScheduleItem[] = [
  {
    id: 1, title: "Apertura", description: "Apertura del evento", date: "2026-06-20T10:00:00.000Z",
    startTime: "10:00", endTime: "10:30", location: "Salón A", notes: null,
    source: "event", taskTitle: null, taskId: null,
  },
  {
    id: 2, title: "Setup DJ", description: null, date: "2026-06-20T08:00:00.000Z",
    startTime: "08:00", endTime: "09:00", location: "Escenario", notes: "Probar sonido",
    source: "task", taskTitle: "DJ", taskId: 10,
  },
  {
    id: 3, title: "Servir cocktail", description: null, date: "2026-06-20T10:30:00.000Z",
    startTime: "10:30", endTime: "11:00", location: "Terraza", notes: null,
    source: "task", taskTitle: "Catering", taskId: 20,
  },
  {
    id: 4, title: "Almuerzo", description: "Almuerzo formal", date: "2026-06-20T13:00:00.000Z",
    startTime: "13:00", endTime: "15:00", location: "Salón B", notes: null,
    source: "task", taskTitle: "Catering", taskId: 20,
  },
  {
    id: 5, title: "Ensayo día previo", description: null, date: "2026-06-19T18:00:00.000Z",
    startTime: "18:00", endTime: "19:00", location: "Salón A", notes: null,
    source: "event", taskTitle: null, taskId: null,
  },
  {
    id: 6, title: "Item sin hora", description: null, date: "2026-06-20T00:00:00.000Z",
    startTime: null, endTime: null, location: null, notes: null,
    source: "event", taskTitle: null, taskId: null,
  },
];

// ============================================
// Tests
// ============================================

describe("Run Sheet - Group by date", () => {
  it("groups items by date correctly", () => {
    const grouped = groupByDate(sampleItems);
    const dates = Object.keys(grouped).sort();
    expect(dates).toHaveLength(2);
    expect(dates[0]).toBe("2026-06-19");
    expect(dates[1]).toBe("2026-06-20");
  });

  it("assigns correct number of items per date", () => {
    const grouped = groupByDate(sampleItems);
    expect(grouped["2026-06-19"]).toHaveLength(1);
    expect(grouped["2026-06-20"]).toHaveLength(5);
  });

  it("handles empty array", () => {
    const grouped = groupByDate([]);
    expect(Object.keys(grouped)).toHaveLength(0);
  });

  it("handles single item", () => {
    const grouped = groupByDate([sampleItems[0]]);
    expect(Object.keys(grouped)).toHaveLength(1);
    expect(Object.values(grouped)[0]).toHaveLength(1);
  });
});

describe("Run Sheet - Sort items by time", () => {
  it("sorts items chronologically by startTime", () => {
    const dayItems = sampleItems.filter(
      (i) => new Date(i.date).toISOString().split("T")[0] === "2026-06-20"
    );
    const sorted = sortItemsByTime(dayItems);
    expect(sorted[0].startTime).toBe("08:00");
    expect(sorted[1].startTime).toBe("10:00");
    expect(sorted[2].startTime).toBe("10:30");
    expect(sorted[3].startTime).toBe("13:00");
  });

  it("places items without startTime at the end", () => {
    const dayItems = sampleItems.filter(
      (i) => new Date(i.date).toISOString().split("T")[0] === "2026-06-20"
    );
    const sorted = sortItemsByTime(dayItems);
    const lastItem = sorted[sorted.length - 1];
    expect(lastItem.startTime).toBeNull();
  });

  it("does not mutate original array", () => {
    const original = [...sampleItems];
    sortItemsByTime(sampleItems);
    expect(sampleItems).toEqual(original);
  });
});

describe("Run Sheet - Unique tasks extraction", () => {
  it("extracts unique tasks from items", () => {
    const tasks = getUniqueTasks(sampleItems);
    expect(tasks).toHaveLength(2);
    expect(tasks.map((t) => t.title)).toContain("DJ");
    expect(tasks.map((t) => t.title)).toContain("Catering");
  });

  it("does not include event-source items", () => {
    const tasks = getUniqueTasks(sampleItems);
    const taskIds = tasks.map((t) => t.id);
    expect(taskIds).not.toContain(null);
  });

  it("deduplicates tasks with same ID", () => {
    const tasks = getUniqueTasks(sampleItems);
    const cateringTasks = tasks.filter((t) => t.id === 20);
    expect(cateringTasks).toHaveLength(1);
  });

  it("returns empty array for event-only items", () => {
    const eventOnly = sampleItems.filter((i) => i.source === "event");
    const tasks = getUniqueTasks(eventOnly);
    expect(tasks).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    expect(getUniqueTasks([])).toHaveLength(0);
  });
});

describe("Run Sheet - Combined sort (date + time)", () => {
  it("produces correct chronological order across dates", () => {
    const grouped = groupByDate(sampleItems);
    const sortedDates = Object.keys(grouped).sort();
    
    const allSorted: ScheduleItem[] = [];
    for (const date of sortedDates) {
      allSorted.push(...sortItemsByTime(grouped[date]));
    }

    // First item should be from June 19 (ensayo)
    expect(allSorted[0].title).toBe("Ensayo día previo");
    expect(allSorted[0].date).toContain("2026-06-19");

    // Second item should be DJ setup at 08:00 on June 20
    expect(allSorted[1].title).toBe("Setup DJ");
    expect(allSorted[1].startTime).toBe("08:00");
  });
});

describe("Run Sheet - PDF filename generation", () => {
  function generateFilename(eventName: string, taskId?: number): string {
    const eventSlug = eventName
      .replace(/\s+/g, "-")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    const suffix = taskId ? `-tarea-${taskId}` : "";
    return `orden-del-dia-${eventSlug}${suffix}.pdf`;
  }

  it("generates correct filename for event", () => {
    expect(generateFilename("Boda María y Juan")).toBe("orden-del-dia-boda-mara-y-juan.pdf");
  });

  it("generates correct filename with task filter", () => {
    expect(generateFilename("Evento Test", 42)).toBe("orden-del-dia-evento-test-tarea-42.pdf");
  });

  it("handles special characters in event name", () => {
    const filename = generateFilename("Evento #1 (2026)");
    expect(filename).toBe("orden-del-dia-evento-1-2026.pdf");
    expect(filename).not.toContain("#");
    expect(filename).not.toContain("(");
  });

  it("handles empty event name", () => {
    expect(generateFilename("")).toBe("orden-del-dia-.pdf");
  });
});

describe("Run Sheet - Vendor portal filtering", () => {
  it("filters items to only task-source items", () => {
    const vendorItems = sampleItems.filter((i) => i.source === "task");
    expect(vendorItems).toHaveLength(3);
    vendorItems.forEach((item) => {
      expect(item.source).toBe("task");
      expect(item.taskId).not.toBeNull();
    });
  });

  it("filters items by specific taskId", () => {
    const cateringItems = sampleItems.filter((i) => i.taskId === 20);
    expect(cateringItems).toHaveLength(2);
    cateringItems.forEach((item) => {
      expect(item.taskTitle).toBe("Catering");
    });
  });

  it("returns empty for non-existent taskId", () => {
    const items = sampleItems.filter((i) => i.taskId === 999);
    expect(items).toHaveLength(0);
  });
});
