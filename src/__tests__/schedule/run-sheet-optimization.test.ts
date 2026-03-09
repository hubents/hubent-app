/**
 * Tests for Run Sheet (Orden del día) optimization.
 * Covers: vendor filtering, vendor display, PDF filename with vendor,
 * form field validation, CRUD operations logic, and filter logic.
 * Pure logic tests — no DB access required.
 */
import { describe, it, expect } from "vitest";

// ============================================
// Interfaces matching the updated code
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
  vendorId: number | null;
  vendorName: string | null;
}

// ============================================
// Logic functions replicated from components
// ============================================

function groupByDate(items: ScheduleItem[]): Record<string, ScheduleItem[]> {
  return items.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
    const dateKey = new Date(item.date).toISOString().split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});
}

function sortItemsByTime(items: ScheduleItem[]): ScheduleItem[] {
  return [...items].sort((a, b) =>
    (a.startTime || "99:99").localeCompare(b.startTime || "99:99")
  );
}

function getUniqueVendors(items: ScheduleItem[]): { id: number; name: string }[] {
  return items
    .filter((i) => i.vendorId && i.vendorName)
    .reduce<{ id: number; name: string }[]>((acc, item) => {
      if (!acc.find((v) => v.id === item.vendorId)) {
        acc.push({ id: item.vendorId!, name: item.vendorName! });
      }
      return acc;
    }, []);
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

function filterItems(
  items: ScheduleItem[],
  filterVendor: string,
  filterTask: string
): ScheduleItem[] {
  return items.filter((item) => {
    if (filterVendor && item.vendorId?.toString() !== filterVendor) return false;
    if (filterTask) {
      if (filterTask === "__event__") {
        if (item.source !== "event") return false;
      } else if (item.taskId?.toString() !== filterTask) {
        return false;
      }
    }
    return true;
  });
}

function generateFilename(
  eventName: string,
  opts?: { taskId?: number; vendorId?: number }
): string {
  const eventSlug = eventName.replace(/\s+/g, "-").toLowerCase();
  const suffix = opts?.taskId
    ? `-tarea-${opts.taskId}`
    : opts?.vendorId
      ? `-proveedor-${opts.vendorId}`
      : "";
  return `orden-del-dia-${eventSlug}${suffix}`;
}

function itemKey(item: ScheduleItem): string {
  return `${item.source}-${item.id}`;
}

// ============================================
// Test data with vendor fields
// ============================================

const sampleItems: ScheduleItem[] = [
  {
    id: 1, title: "Apertura", description: "Bienvenida", date: "2026-06-20T10:00:00.000Z",
    startTime: "10:00", endTime: "10:30", location: "Salón A", notes: null,
    source: "event", taskTitle: null, taskId: null, vendorId: null, vendorName: null,
  },
  {
    id: 2, title: "Setup DJ", description: null, date: "2026-06-20T08:00:00.000Z",
    startTime: "08:00", endTime: "09:00", location: "Escenario", notes: "Probar sonido",
    source: "task", taskTitle: "DJ", taskId: 10, vendorId: 100, vendorName: "SoundPro",
  },
  {
    id: 3, title: "Cocktail", description: null, date: "2026-06-20T10:30:00.000Z",
    startTime: "10:30", endTime: "11:00", location: "Terraza", notes: null,
    source: "task", taskTitle: "Catering", taskId: 20, vendorId: 200, vendorName: "Gourmet SA",
  },
  {
    id: 4, title: "Almuerzo", description: "Almuerzo formal", date: "2026-06-20T13:00:00.000Z",
    startTime: "13:00", endTime: "15:00", location: "Salón B", notes: null,
    source: "task", taskTitle: "Catering", taskId: 20, vendorId: 200, vendorName: "Gourmet SA",
  },
  {
    id: 5, title: "Ensayo", description: null, date: "2026-06-19T18:00:00.000Z",
    startTime: "18:00", endTime: "19:00", location: "Salón A", notes: null,
    source: "event", taskTitle: null, taskId: null, vendorId: null, vendorName: null,
  },
  {
    id: 6, title: "Iluminación", description: null, date: "2026-06-20T07:00:00.000Z",
    startTime: "07:00", endTime: "08:00", location: null, notes: null,
    source: "task", taskTitle: "Decoración", taskId: 30, vendorId: null, vendorName: null,
  },
];

// ============================================
// G2: Vendor selector — unique vendors extraction
// ============================================

describe("Vendor extraction (G2)", () => {
  it("extracts unique vendors from items", () => {
    const vendors = getUniqueVendors(sampleItems);
    expect(vendors).toHaveLength(2);
    expect(vendors.map((v) => v.name)).toContain("SoundPro");
    expect(vendors.map((v) => v.name)).toContain("Gourmet SA");
  });

  it("deduplicates vendors with same ID", () => {
    const vendors = getUniqueVendors(sampleItems);
    const gourmet = vendors.filter((v) => v.id === 200);
    expect(gourmet).toHaveLength(1);
  });

  it("excludes items without vendorId", () => {
    const vendors = getUniqueVendors(sampleItems);
    const ids = vendors.map((v) => v.id);
    expect(ids).not.toContain(null);
  });

  it("returns empty for event-only items", () => {
    const eventOnly = sampleItems.filter((i) => i.source === "event");
    expect(getUniqueVendors(eventOnly)).toHaveLength(0);
  });

  it("returns empty for items without vendors", () => {
    const noVendor = sampleItems.filter((i) => !i.vendorId);
    expect(getUniqueVendors(noVendor)).toHaveLength(0);
  });
});

// ============================================
// G7: Filters — vendor + task + combined
// ============================================

describe("Filter by vendor (G7)", () => {
  it("filters items by vendorId", () => {
    const filtered = filterItems(sampleItems, "200", "");
    expect(filtered).toHaveLength(2);
    filtered.forEach((item) => {
      expect(item.vendorId).toBe(200);
      expect(item.vendorName).toBe("Gourmet SA");
    });
  });

  it("returns empty for non-existent vendorId", () => {
    const filtered = filterItems(sampleItems, "999", "");
    expect(filtered).toHaveLength(0);
  });

  it("includes all items when vendor filter is empty", () => {
    const filtered = filterItems(sampleItems, "", "");
    expect(filtered).toHaveLength(sampleItems.length);
  });

  it("excludes event items when filtering by vendor (they have no vendorId)", () => {
    const filtered = filterItems(sampleItems, "100", "");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].source).toBe("task");
  });
});

describe("Filter by task (G7)", () => {
  it("filters items by taskId", () => {
    const filtered = filterItems(sampleItems, "", "20");
    expect(filtered).toHaveLength(2);
    filtered.forEach((item) => {
      expect(item.taskId).toBe(20);
    });
  });

  it("filters event-only items with __event__", () => {
    const filtered = filterItems(sampleItems, "", "__event__");
    expect(filtered).toHaveLength(2);
    filtered.forEach((item) => {
      expect(item.source).toBe("event");
    });
  });

  it("returns empty for non-existent taskId", () => {
    const filtered = filterItems(sampleItems, "", "999");
    expect(filtered).toHaveLength(0);
  });
});

describe("Combined filters (G7)", () => {
  it("filters by vendor AND task", () => {
    const filtered = filterItems(sampleItems, "200", "20");
    expect(filtered).toHaveLength(2);
    filtered.forEach((item) => {
      expect(item.vendorId).toBe(200);
      expect(item.taskId).toBe(20);
    });
  });

  it("returns empty for contradictory filters", () => {
    // vendor=100 is only on taskId=10, filter taskId=20 → no match
    const filtered = filterItems(sampleItems, "100", "20");
    expect(filtered).toHaveLength(0);
  });

  it("vendor filter + __event__ returns empty (event items have no vendor)", () => {
    const filtered = filterItems(sampleItems, "100", "__event__");
    expect(filtered).toHaveLength(0);
  });
});

// ============================================
// G8: Vendor display in timeline
// ============================================

describe("Vendor display in timeline (G8)", () => {
  it("items retain vendorName for display", () => {
    const withVendor = sampleItems.filter((i) => i.vendorName);
    expect(withVendor).toHaveLength(3);
    expect(withVendor[0].vendorName).toBe("SoundPro");
    expect(withVendor[1].vendorName).toBe("Gourmet SA");
  });

  it("event items have null vendorName", () => {
    const eventItems = sampleItems.filter((i) => i.source === "event");
    eventItems.forEach((item) => {
      expect(item.vendorName).toBeNull();
    });
  });

  it("task items without vendor have null vendorName", () => {
    const taskNoVendor = sampleItems.filter((i) => i.source === "task" && !i.vendorId);
    expect(taskNoVendor).toHaveLength(1);
    expect(taskNoVendor[0].vendorName).toBeNull();
    expect(taskNoVendor[0].title).toBe("Iluminación");
  });
});

// ============================================
// G9+G12: PDF filename with vendor filter
// ============================================

describe("PDF filename generation with vendor (G9/G12)", () => {
  it("generates correct filename for full event PDF", () => {
    expect(generateFilename("Boda Test")).toBe("orden-del-dia-boda-test");
  });

  it("generates correct filename with task filter", () => {
    expect(generateFilename("Boda Test", { taskId: 42 })).toBe(
      "orden-del-dia-boda-test-tarea-42"
    );
  });

  it("generates correct filename with vendor filter", () => {
    expect(generateFilename("Boda Test", { vendorId: 100 })).toBe(
      "orden-del-dia-boda-test-proveedor-100"
    );
  });

  it("taskId takes precedence over vendorId", () => {
    expect(generateFilename("Evento", { taskId: 1, vendorId: 2 })).toBe(
      "orden-del-dia-evento-tarea-1"
    );
  });
});

// ============================================
// G6: CRUD item key uniqueness
// ============================================

describe("Item key uniqueness (G6 CRUD)", () => {
  it("generates unique keys for items", () => {
    const keys = sampleItems.map(itemKey);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("differentiates event vs task items with same id", () => {
    const eventItem: ScheduleItem = { ...sampleItems[0], id: 1, source: "event" };
    const taskItem: ScheduleItem = { ...sampleItems[1], id: 1, source: "task" };
    expect(itemKey(eventItem)).not.toBe(itemKey(taskItem));
    expect(itemKey(eventItem)).toBe("event-1");
    expect(itemKey(taskItem)).toBe("task-1");
  });
});

// ============================================
// G1: vendorId in schema — validation logic
// ============================================

describe("vendorId field validation (G1)", () => {
  it("vendorId is nullable", () => {
    const itemWithVendor = sampleItems.find((i) => i.vendorId === 100);
    expect(itemWithVendor).toBeDefined();
    expect(itemWithVendor!.vendorId).toBe(100);

    const itemWithout = sampleItems.find((i) => i.source === "task" && !i.vendorId);
    expect(itemWithout).toBeDefined();
    expect(itemWithout!.vendorId).toBeNull();
  });

  it("event items never have vendorId", () => {
    const events = sampleItems.filter((i) => i.source === "event");
    events.forEach((item) => {
      expect(item.vendorId).toBeNull();
    });
  });
});

// ============================================
// G3+G4: Form fields — location + notes/title labels
// ============================================

describe("Form field handling (G3/G4)", () => {
  interface FormData {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    description: string;
    vendorId: string;
  }

  function validateForm(form: FormData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!form.title.trim()) errors.push("title required");
    if (!form.date) errors.push("date required");
    return { valid: errors.length === 0, errors };
  }

  function buildPayload(form: FormData) {
    return {
      title: form.title.trim(),
      date: form.date,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      location: form.location.trim() || undefined,
      description: form.description.trim() || undefined,
      vendorId: form.vendorId ? parseInt(form.vendorId, 10) : undefined,
    };
  }

  it("validates required fields", () => {
    const empty: FormData = { title: "", date: "", startTime: "", endTime: "", location: "", description: "", vendorId: "" };
    const result = validateForm(empty);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("title required");
    expect(result.errors).toContain("date required");
  });

  it("passes validation with title and date", () => {
    const valid: FormData = { title: "Test", date: "2026-06-20", startTime: "", endTime: "", location: "", description: "", vendorId: "" };
    expect(validateForm(valid).valid).toBe(true);
  });

  it("builds payload with vendorId when provided", () => {
    const form: FormData = { title: "Test", date: "2026-06-20", startTime: "10:00", endTime: "11:00", location: "Salón A", description: "Notas", vendorId: "100" };
    const payload = buildPayload(form);
    expect(payload.vendorId).toBe(100);
    expect(payload.location).toBe("Salón A");
    expect(payload.description).toBe("Notas");
  });

  it("builds payload without vendorId when empty", () => {
    const form: FormData = { title: "Test", date: "2026-06-20", startTime: "", endTime: "", location: "", description: "", vendorId: "" };
    const payload = buildPayload(form);
    expect(payload.vendorId).toBeUndefined();
    expect(payload.location).toBeUndefined();
    expect(payload.description).toBeUndefined();
  });

  it("trims whitespace from text fields", () => {
    const form: FormData = { title: "  Test  ", date: "2026-06-20", startTime: "", endTime: "", location: "  Salón  ", description: "  Nota  ", vendorId: "" };
    const payload = buildPayload(form);
    expect(payload.title).toBe("Test");
    expect(payload.location).toBe("Salón");
    expect(payload.description).toBe("Nota");
  });
});

// ============================================
// G10: Print — URL generation
// ============================================

describe("Print URL generation (G10)", () => {
  function buildPrintUrl(eventId: number, filterVendor: string, filterTask: string): string {
    const params = new URLSearchParams();
    if (filterVendor) params.set("vendorId", filterVendor);
    if (filterTask) params.set("taskId", filterTask);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return `/api/events/${eventId}/run-sheet/pdf${qs}`;
  }

  it("generates base URL without filters", () => {
    expect(buildPrintUrl(1, "", "")).toBe("/api/events/1/run-sheet/pdf");
  });

  it("adds vendorId param when filtered", () => {
    expect(buildPrintUrl(1, "100", "")).toBe("/api/events/1/run-sheet/pdf?vendorId=100");
  });

  it("adds taskId param when filtered", () => {
    expect(buildPrintUrl(1, "", "20")).toBe("/api/events/1/run-sheet/pdf?taskId=20");
  });

  it("adds both params when both filtered", () => {
    const url = buildPrintUrl(1, "100", "20");
    expect(url).toContain("vendorId=100");
    expect(url).toContain("taskId=20");
  });
});

// ============================================
// G15: Vendor portal — items include vendorName
// ============================================

describe("Vendor portal data shape (G15)", () => {
  const vendorPortalItems = sampleItems
    .filter((i) => i.source === "task")
    .map((item) => ({ ...item, source: "task" as const }));

  it("all vendor portal items have source=task", () => {
    vendorPortalItems.forEach((item) => {
      expect(item.source).toBe("task");
    });
  });

  it("vendor portal items include vendorName field", () => {
    vendorPortalItems.forEach((item) => {
      expect("vendorName" in item).toBe(true);
    });
  });

  it("vendor portal items include vendorId field", () => {
    vendorPortalItems.forEach((item) => {
      expect("vendorId" in item).toBe(true);
    });
  });
});

// ============================================
// G11: PDF table columns — verify data shape
// ============================================

describe("PDF data shape with vendor column (G11)", () => {
  interface PdfRow {
    startTime: string | null;
    endTime: string | null;
    title: string;
    description: string | null;
    vendorName: string | null;
    location: string | null;
    source: string;
    taskTitle: string | null;
    notes: string | null;
  }

  function toPdfRow(item: ScheduleItem): PdfRow {
    return {
      startTime: item.startTime,
      endTime: item.endTime,
      title: item.title,
      description: item.description,
      vendorName: item.vendorName,
      location: item.location,
      source: item.source,
      taskTitle: item.taskTitle,
      notes: item.notes,
    };
  }

  it("all items can be converted to PDF row format", () => {
    sampleItems.forEach((item) => {
      const row = toPdfRow(item);
      expect(row).toHaveProperty("vendorName");
      expect(row).toHaveProperty("location");
      expect(row).toHaveProperty("notes");
    });
  });

  it("vendorName renders as dash for null", () => {
    const eventRow = toPdfRow(sampleItems[0]);
    expect(eventRow.vendorName || "—").toBe("—");
  });

  it("vendorName renders actual name for task items with vendor", () => {
    const taskRow = toPdfRow(sampleItems[1]);
    expect(taskRow.vendorName || "—").toBe("SoundPro");
  });
});

// ============================================
// Edge cases
// ============================================

describe("Edge cases", () => {
  it("handles empty items array for all operations", () => {
    expect(groupByDate([])).toEqual({});
    expect(sortItemsByTime([])).toEqual([]);
    expect(getUniqueVendors([])).toEqual([]);
    expect(getUniqueTasks([])).toEqual([]);
    expect(filterItems([], "100", "20")).toEqual([]);
  });

  it("handles items with all null optional fields", () => {
    const minimal: ScheduleItem = {
      id: 99, title: "Minimal", description: null, date: "2026-01-01T00:00:00.000Z",
      startTime: null, endTime: null, location: null, notes: null,
      source: "event", taskTitle: null, taskId: null, vendorId: null, vendorName: null,
    };
    const grouped = groupByDate([minimal]);
    expect(Object.keys(grouped)).toHaveLength(1);
    const sorted = sortItemsByTime([minimal]);
    expect(sorted[0].startTime).toBeNull();
  });

  it("filter with vendorId excludes event-source items correctly", () => {
    const filtered = filterItems(sampleItems, "200", "");
    filtered.forEach((item) => {
      expect(item.source).toBe("task");
    });
  });
});
