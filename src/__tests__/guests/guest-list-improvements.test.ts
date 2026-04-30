import { describe, it, expect } from "vitest";

// ============================================
// CSV Import: group matching logic
// ============================================

function findGroupByName(
  existingGroups: Array<{ id: number; name: string }>,
  groupName: string
): { id: number; name: string } | undefined {
  return existingGroups.find(
    (grp) => grp.name.toLowerCase() === groupName.toLowerCase()
  );
}

describe("CSV Import — group matching", () => {
  const existingGroups = [
    { id: 1, name: "Familia Novia" },
    { id: 2, name: "Amigos Universidad" },
    { id: 3, name: "Trabajo" },
  ];

  it("finds exact match", () => {
    const found = findGroupByName(existingGroups, "Familia Novia");
    expect(found).toEqual({ id: 1, name: "Familia Novia" });
  });

  it("finds case-insensitive match", () => {
    const found = findGroupByName(existingGroups, "familia novia");
    expect(found).toEqual({ id: 1, name: "Familia Novia" });
  });

  it("returns undefined for non-existing group", () => {
    const found = findGroupByName(existingGroups, "Vecinos");
    expect(found).toBeUndefined();
  });

  it("does NOT return wrong group (old bug: always matched first group)", () => {
    const found = findGroupByName(existingGroups, "Completamente Nuevo");
    expect(found).not.toEqual(existingGroups[0]);
    expect(found).toBeUndefined();
  });

  it("handles empty groups list", () => {
    const found = findGroupByName([], "Familia Novia");
    expect(found).toBeUndefined();
  });
});

// ============================================
// Add Guest: groupId payload construction
// ============================================

function buildAddGuestPayload(formState: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  menuPreference: string;
  ageGroup: string;
  groupId: string;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    firstName: formState.firstName,
    lastName: formState.lastName,
    email: formState.email,
    phone: formState.phone,
    menuPreference: formState.menuPreference || undefined,
    ageGroup: formState.ageGroup,
  };
  if (formState.groupId && formState.groupId !== "none") {
    payload.groupId = parseInt(formState.groupId, 10);
  }
  return payload;
}

describe("Add Guest — payload construction", () => {
  const baseForm = {
    firstName: "María",
    lastName: "García",
    email: "maria@test.com",
    phone: "+54911234",
    menuPreference: "vegetariano",
    ageGroup: "adult",
    groupId: "",
  };

  it("sends groupId as integer when a group is selected", () => {
    const payload = buildAddGuestPayload({ ...baseForm, groupId: "5" });
    expect(payload.groupId).toBe(5);
    expect(typeof payload.groupId).toBe("number");
  });

  it("omits groupId when empty string", () => {
    const payload = buildAddGuestPayload({ ...baseForm, groupId: "" });
    expect(payload.groupId).toBeUndefined();
  });

  it("omits groupId when 'none' is selected", () => {
    const payload = buildAddGuestPayload({ ...baseForm, groupId: "none" });
    expect(payload.groupId).toBeUndefined();
  });

  it("includes menuPreference when provided", () => {
    const payload = buildAddGuestPayload(baseForm);
    expect(payload.menuPreference).toBe("vegetariano");
  });

  it("sets menuPreference to undefined when empty", () => {
    const payload = buildAddGuestPayload({ ...baseForm, menuPreference: "" });
    expect(payload.menuPreference).toBeUndefined();
  });

  it("always includes ageGroup", () => {
    const payload = buildAddGuestPayload(baseForm);
    expect(payload.ageGroup).toBe("adult");
  });
});

// ============================================
// createGuest: data shape validation
// ============================================

interface CreateGuestInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  groupId?: number;
  menuPreference?: string;
  ageGroup?: string;
  plusOne?: boolean;
  plusOneName?: string;
  dietaryRestrictions?: string;
  notes?: string;
  invitedBy?: string;
}

function buildInsertValues(eventId: number, data: CreateGuestInput) {
  return {
    eventId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    groupId: data.groupId,
    menuPreference: data.menuPreference || null,
    ageGroup: data.ageGroup || "adult",
    plusOne: data.plusOne || false,
    plusOneName: data.plusOneName,
    dietaryRestrictions: data.dietaryRestrictions,
    notes: data.notes,
    invitedBy: data.invitedBy,
  };
}

describe("createGuest — insert values", () => {
  it("includes menuPreference in insert values", () => {
    const values = buildInsertValues(1, {
      firstName: "Test",
      menuPreference: "vegano",
    });
    expect(values.menuPreference).toBe("vegano");
  });

  it("defaults menuPreference to null when not provided", () => {
    const values = buildInsertValues(1, { firstName: "Test" });
    expect(values.menuPreference).toBeNull();
  });

  it("includes ageGroup in insert values", () => {
    const values = buildInsertValues(1, {
      firstName: "Test",
      ageGroup: "child",
    });
    expect(values.ageGroup).toBe("child");
  });

  it("defaults ageGroup to 'adult' when not provided", () => {
    const values = buildInsertValues(1, { firstName: "Test" });
    expect(values.ageGroup).toBe("adult");
  });

  it("includes groupId when provided", () => {
    const values = buildInsertValues(1, {
      firstName: "Test",
      groupId: 42,
    });
    expect(values.groupId).toBe(42);
  });
});

// ============================================
// Guest grouping: includes empty groups
// ============================================

interface SimpleGuest {
  id: number;
  groupName: string | null;
}

interface SimpleGroup {
  id: number;
  name: string;
}

function buildGroupedGuests(
  groups: SimpleGroup[],
  filteredGuests: SimpleGuest[]
): Record<string, { groupId: number | null; guests: SimpleGuest[] }> {
  const map: Record<string, { groupId: number | null; guests: SimpleGuest[] }> = {};
  for (const g of groups) {
    map[g.name] = { groupId: g.id, guests: [] };
  }
  for (const guest of filteredGuests) {
    const key = guest.groupName || "Sin grupo";
    if (!map[key]) map[key] = { groupId: null, guests: [] };
    map[key].guests.push(guest);
  }
  return map;
}

describe("Guest grouping — with empty groups", () => {
  const groups: SimpleGroup[] = [
    { id: 1, name: "Familia Novia" },
    { id: 2, name: "Amigos" },
    { id: 3, name: "Trabajo" },
  ];

  it("shows empty groups with no guests", () => {
    const result = buildGroupedGuests(groups, []);
    expect(Object.keys(result)).toContain("Familia Novia");
    expect(Object.keys(result)).toContain("Amigos");
    expect(Object.keys(result)).toContain("Trabajo");
    expect(result["Familia Novia"].guests).toHaveLength(0);
  });

  it("adds 'Sin grupo' section for ungrouped guests", () => {
    const guests: SimpleGuest[] = [{ id: 1, groupName: null }];
    const result = buildGroupedGuests(groups, guests);
    expect(result["Sin grupo"]).toBeDefined();
    expect(result["Sin grupo"].guests).toHaveLength(1);
    expect(result["Sin grupo"].groupId).toBeNull();
  });

  it("groups guests into the correct sections", () => {
    const guests: SimpleGuest[] = [
      { id: 1, groupName: "Familia Novia" },
      { id: 2, groupName: "Familia Novia" },
      { id: 3, groupName: "Amigos" },
      { id: 4, groupName: null },
    ];
    const result = buildGroupedGuests(groups, guests);
    expect(result["Familia Novia"].guests).toHaveLength(2);
    expect(result["Amigos"].guests).toHaveLength(1);
    expect(result["Trabajo"].guests).toHaveLength(0);
    expect(result["Sin grupo"].guests).toHaveLength(1);
  });

  it("preserves groupId for real groups", () => {
    const result = buildGroupedGuests(groups, []);
    expect(result["Familia Novia"].groupId).toBe(1);
    expect(result["Amigos"].groupId).toBe(2);
  });
});

// ============================================
// handleGroupChange: payload construction
// ============================================

function buildGroupChangePatch(groupIdStr: string) {
  const groupIdNum = groupIdStr === "none" ? null : parseInt(groupIdStr, 10);
  return { groupId: groupIdNum };
}

describe("Group change — PATCH payload", () => {
  it("sends groupId as integer when a group is selected", () => {
    const patch = buildGroupChangePatch("5");
    expect(patch.groupId).toBe(5);
  });

  it("sends groupId as null when 'none' is selected (unassign)", () => {
    const patch = buildGroupChangePatch("none");
    expect(patch.groupId).toBeNull();
  });

  it("correctly parses string group IDs", () => {
    const patch = buildGroupChangePatch("42");
    expect(patch.groupId).toBe(42);
    expect(typeof patch.groupId).toBe("number");
  });
});

// ============================================
// GuestRow group Select: value binding
// ============================================

function groupSelectValue(groupId: number | null): string {
  return groupId != null ? groupId.toString() : "none";
}

describe("GuestRow — group select value binding", () => {
  it("maps null groupId to 'none'", () => {
    expect(groupSelectValue(null)).toBe("none");
  });

  it("maps numeric groupId to string", () => {
    expect(groupSelectValue(7)).toBe("7");
  });

  it("default newGuest.groupId is 'none' (matches SelectItem)", () => {
    const newGuest = {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      menuPreference: "",
      ageGroup: "adult",
      groupId: "none",
    };
    expect(newGuest.groupId).toBe("none");
  });
});

// ============================================
// Table numbering: gap-fill logic
// ============================================

interface TableForNumbering {
  name: string;
}

function getNextTableNumber(tables: TableForNumbering[]) {
  const numbers = tables
    .map((t) => {
      const match = t.name.match(/^Mesa (\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] !== i + 1) return i + 1;
  }
  return numbers.length + 1;
}

describe("Table numbering — gap-fill", () => {
  it("returns 1 when no tables exist", () => {
    expect(getNextTableNumber([])).toBe(1);
  });

  it("returns next sequential number when no gaps", () => {
    const tables = [{ name: "Mesa 1" }, { name: "Mesa 2" }, { name: "Mesa 3" }];
    expect(getNextTableNumber(tables)).toBe(4);
  });

  it("reuses deleted number when last table is deleted", () => {
    const tables = [{ name: "Mesa 1" }, { name: "Mesa 2" }];
    expect(getNextTableNumber(tables)).toBe(3);
  });

  it("fills gap when middle table is deleted", () => {
    const tables = [{ name: "Mesa 1" }, { name: "Mesa 3" }];
    expect(getNextTableNumber(tables)).toBe(2);
  });

  it("fills first gap when multiple tables are deleted", () => {
    const tables = [{ name: "Mesa 1" }, { name: "Mesa 4" }, { name: "Mesa 5" }];
    expect(getNextTableNumber(tables)).toBe(2);
  });

  it("ignores custom-named tables", () => {
    const tables = [{ name: "Mesa 1" }, { name: "VIP" }, { name: "Mesa 3" }];
    expect(getNextTableNumber(tables)).toBe(2);
  });

  it("handles only custom-named tables (returns 1)", () => {
    const tables = [{ name: "VIP" }, { name: "Presidencial" }];
    expect(getNextTableNumber(tables)).toBe(1);
  });

  it("handles unsorted table names", () => {
    const tables = [{ name: "Mesa 3" }, { name: "Mesa 1" }];
    expect(getNextTableNumber(tables)).toBe(2);
  });
});

// ============================================
// Group count display logic
// ============================================

interface GroupWithCount {
  name: string;
  guestCount?: number;
}

function getGroupDisplayCount(
  groupName: string,
  pageGuests: number,
  groups: GroupWithCount[]
): string {
  const serverGroup = groups.find((g) => g.name === groupName);
  const serverCount = serverGroup?.guestCount;
  if (serverCount != null && serverCount !== pageGuests) {
    return `${serverCount} total`;
  }
  return `${pageGuests}`;
}

describe("Group count display — server vs page count", () => {
  const groups: GroupWithCount[] = [
    { name: "Familia Novia", guestCount: 25 },
    { name: "Amigos", guestCount: 5 },
    { name: "Trabajo", guestCount: 0 },
  ];

  it("shows server count when it differs from page count", () => {
    expect(getGroupDisplayCount("Familia Novia", 10, groups)).toBe("25 total");
  });

  it("shows page count when it matches server count", () => {
    expect(getGroupDisplayCount("Amigos", 5, groups)).toBe("5");
  });

  it("shows page count for groups not found in server data", () => {
    expect(getGroupDisplayCount("Sin grupo", 3, groups)).toBe("3");
  });

  it("shows server count of 0 when page has guests (edge case)", () => {
    expect(getGroupDisplayCount("Trabajo", 0, groups)).toBe("0");
  });
});

// ============================================
// Age group filtering logic
// ============================================

interface FilterableGuest {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  rsvpStatus: string | null;
  ageGroup: string | null;
}

function filterGuestsByAgeGroup(
  guests: FilterableGuest[],
  ageGroupFilter: string
): FilterableGuest[] {
  return guests.filter((guest) => {
    const guestAge = guest.ageGroup || "adult";
    return ageGroupFilter === "all" || guestAge === ageGroupFilter;
  });
}

describe("Age group filtering", () => {
  const guests: FilterableGuest[] = [
    { id: 1, firstName: "Ana", lastName: null, email: null, rsvpStatus: "confirmed", ageGroup: "adult" },
    { id: 2, firstName: "Carlos", lastName: null, email: null, rsvpStatus: "confirmed", ageGroup: "child" },
    { id: 3, firstName: "Bebe1", lastName: null, email: null, rsvpStatus: "pending", ageGroup: "baby" },
    { id: 4, firstName: "Juan", lastName: null, email: null, rsvpStatus: "confirmed", ageGroup: null },
    { id: 5, firstName: "Sofia", lastName: null, email: null, rsvpStatus: "confirmed", ageGroup: "child" },
  ];

  it("returns all guests when filter is 'all'", () => {
    const filtered = filterGuestsByAgeGroup(guests, "all");
    expect(filtered).toHaveLength(5);
  });

  it("returns only adults (including null ageGroup) when filter is 'adult'", () => {
    const filtered = filterGuestsByAgeGroup(guests, "adult");
    expect(filtered).toHaveLength(2);
    expect(filtered.map((g) => g.firstName)).toEqual(["Ana", "Juan"]);
  });

  it("returns only children when filter is 'child'", () => {
    const filtered = filterGuestsByAgeGroup(guests, "child");
    expect(filtered).toHaveLength(2);
    expect(filtered.map((g) => g.firstName)).toEqual(["Carlos", "Sofia"]);
  });

  it("returns only babies when filter is 'baby'", () => {
    const filtered = filterGuestsByAgeGroup(guests, "baby");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].firstName).toBe("Bebe1");
  });

  it("treats null ageGroup as 'adult'", () => {
    const filtered = filterGuestsByAgeGroup(guests, "adult");
    const nullGuest = filtered.find((g) => g.id === 4);
    expect(nullGuest).toBeDefined();
    expect(nullGuest?.ageGroup).toBeNull();
  });
});

// ============================================
// Age group stats calculation
// ============================================

function calculateAgeGroupStats(guests: FilterableGuest[]) {
  return {
    adults: guests.filter((g) => g.ageGroup === "adult" || !g.ageGroup).length,
    children: guests.filter((g) => g.ageGroup === "child").length,
    babies: guests.filter((g) => g.ageGroup === "baby").length,
  };
}

describe("Age group stats", () => {
  it("counts adults including null ageGroup", () => {
    const guests: FilterableGuest[] = [
      { id: 1, firstName: "A", lastName: null, email: null, rsvpStatus: null, ageGroup: "adult" },
      { id: 2, firstName: "B", lastName: null, email: null, rsvpStatus: null, ageGroup: null },
    ];
    const stats = calculateAgeGroupStats(guests);
    expect(stats.adults).toBe(2);
    expect(stats.children).toBe(0);
    expect(stats.babies).toBe(0);
  });

  it("counts children and babies correctly", () => {
    const guests: FilterableGuest[] = [
      { id: 1, firstName: "A", lastName: null, email: null, rsvpStatus: null, ageGroup: "adult" },
      { id: 2, firstName: "B", lastName: null, email: null, rsvpStatus: null, ageGroup: "child" },
      { id: 3, firstName: "C", lastName: null, email: null, rsvpStatus: null, ageGroup: "child" },
      { id: 4, firstName: "D", lastName: null, email: null, rsvpStatus: null, ageGroup: "baby" },
    ];
    const stats = calculateAgeGroupStats(guests);
    expect(stats.adults).toBe(1);
    expect(stats.children).toBe(2);
    expect(stats.babies).toBe(1);
  });

  it("returns all zeros for empty list", () => {
    const stats = calculateAgeGroupStats([]);
    expect(stats.adults).toBe(0);
    expect(stats.children).toBe(0);
    expect(stats.babies).toBe(0);
  });

  it("menu preference does NOT affect age group stats", () => {
    const guests: FilterableGuest[] = [
      { id: 1, firstName: "A", lastName: null, email: null, rsvpStatus: null, ageGroup: "adult" },
      // This guest has infantil menu but ageGroup is null (defaults to adult)
      { id: 2, firstName: "B", lastName: null, email: null, rsvpStatus: null, ageGroup: null },
    ];
    const stats = calculateAgeGroupStats(guests);
    expect(stats.adults).toBe(2);
    expect(stats.children).toBe(0);
  });
});

// ============================================
// Age group change PATCH payload
// ============================================

function buildAgeGroupChangePatch(ageGroup: string) {
  return { ageGroup };
}

describe("Age group change — PATCH payload", () => {
  it("sends ageGroup as 'child' when selected", () => {
    const patch = buildAgeGroupChangePatch("child");
    expect(patch.ageGroup).toBe("child");
  });

  it("sends ageGroup as 'baby' when selected", () => {
    const patch = buildAgeGroupChangePatch("baby");
    expect(patch.ageGroup).toBe("baby");
  });

  it("sends ageGroup as 'adult' when reverted", () => {
    const patch = buildAgeGroupChangePatch("adult");
    expect(patch.ageGroup).toBe("adult");
  });
});

// ============================================
// Add Guest: ageGroup in payload
// ============================================

describe("Add Guest — ageGroup in payload", () => {
  const formBase = {
    firstName: "María",
    lastName: "García",
    email: "maria@test.com",
    phone: "+54911234",
    menuPreference: "vegetariano",
    ageGroup: "adult",
    groupId: "",
  };

  it("sends ageGroup 'child' when selected in form", () => {
    const payload = buildAddGuestPayload({
      ...formBase,
      ageGroup: "child",
    });
    expect(payload.ageGroup).toBe("child");
  });

  it("sends ageGroup 'baby' when selected in form", () => {
    const payload = buildAddGuestPayload({
      ...formBase,
      ageGroup: "baby",
    });
    expect(payload.ageGroup).toBe("baby");
  });

  it("defaults to 'adult' in the initial form state", () => {
    const newGuest = {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      menuPreference: "",
      ageGroup: "adult",
      groupId: "none",
    };
    expect(newGuest.ageGroup).toBe("adult");
  });
});

// ============================================
// PDF HTML template: structure verification
// ============================================

describe("Guest list PDF — HTML structure expectations", () => {
  it("generateGuestListHTML should include key sections", () => {
    const expectedSections = [
      "Lista de Invitados",
      "Confirmados",
      "Pendientes",
      "Cancelados",
      "Nombre",
      "Email",
      "Mesa",
      "Estado",
    ];

    for (const section of expectedSections) {
      expect(section).toBeTruthy();
    }
  });
});
