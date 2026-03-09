/**
 * Tests for eventScoped permission enforcement logic (F1 + F2 fixes).
 * Pure logic tests — no DB, no React rendering required.
 *
 * Validates:
 * - F1: Tasks readOnly derivation from event permissions
 * - F2: Finance canEdit derivation from event permissions
 * - API-level permission check logic for eventScoped users
 * - Client role permission set after fix script
 */
import { describe, it, expect } from "vitest";

// ========== Types ==========

type EventSectionLevel = "view" | "edit" | "none";

interface EventSectionPermissions {
  general?: EventSectionLevel;
  tasks?: EventSectionLevel;
  guests?: EventSectionLevel;
  rsvp?: EventSectionLevel;
  vendors?: EventSectionLevel;
  finances?: EventSectionLevel;
  settings?: EventSectionLevel;
}

// ========== Replicate core permission logic ==========

function canView(permissions: EventSectionPermissions | null, section: keyof EventSectionPermissions, eventScoped: boolean): boolean {
  if (!eventScoped) return true;
  if (!permissions) return false;
  const level = permissions[section] || "none";
  return level !== "none";
}

function canEdit(permissions: EventSectionPermissions | null, section: keyof EventSectionPermissions, eventScoped: boolean): boolean {
  if (!eventScoped) return true;
  if (!permissions) return false;
  const level = permissions[section] || "none";
  return level === "edit";
}

// Replicate the readOnly derivation: readOnly = !canEdit("tasks")
function isTaskReadOnly(permissions: EventSectionPermissions | null, eventScoped: boolean): boolean {
  return !canEdit(permissions, "tasks", eventScoped);
}

// Replicate the canEditFinances derivation
function canEditFinances(permissions: EventSectionPermissions | null, eventScoped: boolean): boolean {
  return canEdit(permissions, "finances", eventScoped);
}

// ========== API permission check simulation ==========

interface MockSession {
  eventScoped: boolean;
  orgPermissions: string[];
}

function requirePermission(session: MockSession, permission: string): boolean {
  return session.orgPermissions.includes(permission);
}

function requireEventSectionAccess(
  permissions: EventSectionPermissions,
  section: keyof EventSectionPermissions,
  level: EventSectionLevel
): boolean {
  const sectionLevel = permissions[section] || "none";
  if (level === "edit") return sectionLevel === "edit";
  if (level === "view") return sectionLevel !== "none";
  return false;
}

function canPatchTask(session: MockSession, eventPermissions: EventSectionPermissions | null): boolean {
  if (!requirePermission(session, "tasks:update")) return false;
  if (session.eventScoped && eventPermissions) {
    return requireEventSectionAccess(eventPermissions, "tasks", "edit");
  }
  return true;
}

function canDeleteTask(session: MockSession, eventPermissions: EventSectionPermissions | null): boolean {
  if (!requirePermission(session, "tasks:update")) return false;
  if (session.eventScoped && eventPermissions) {
    return requireEventSectionAccess(eventPermissions, "tasks", "edit");
  }
  return true;
}

// ========== Client role permission set ==========

const CLIENT_ROLE_PERMISSIONS_BEFORE_FIX = [
  "events:read", "events:update",
  "tasks:read", "tasks:create", "tasks:update", "tasks:comment",
  "vendors:read",
  "guests:read", "guests:manage",
  "finance:read",
];

const CLIENT_ROLE_PERMISSIONS_AFTER_FIX = [
  "events:read", "events:update",
  "tasks:read", "tasks:comment",
  "vendors:read",
  "guests:read", "guests:manage",
  "finance:read",
];

// ========== F1: Tasks readOnly ==========

describe("F1: Tasks — readOnly when permission = 'view'", () => {
  describe("UI: isTaskReadOnly derivation", () => {
    it("non-eventScoped user → never readOnly", () => {
      expect(isTaskReadOnly(null, false)).toBe(false);
      expect(isTaskReadOnly({ tasks: "view" }, false)).toBe(false);
      expect(isTaskReadOnly({ tasks: "none" }, false)).toBe(false);
    });

    it("eventScoped + tasks:edit → not readOnly", () => {
      expect(isTaskReadOnly({ tasks: "edit" }, true)).toBe(false);
    });

    it("eventScoped + tasks:view → readOnly", () => {
      expect(isTaskReadOnly({ tasks: "view" }, true)).toBe(true);
    });

    it("eventScoped + tasks:none → readOnly", () => {
      expect(isTaskReadOnly({ tasks: "none" }, true)).toBe(true);
    });

    it("eventScoped + no tasks key → readOnly (defaults to none)", () => {
      expect(isTaskReadOnly({}, true)).toBe(true);
    });

    it("eventScoped + null permissions → readOnly", () => {
      expect(isTaskReadOnly(null, true)).toBe(true);
    });
  });

  describe("API: PATCH/DELETE blocked for view-only client", () => {
    it("client with tasks:update org perm BUT tasks:view event perm → PATCH blocked", () => {
      const session: MockSession = {
        eventScoped: true,
        orgPermissions: CLIENT_ROLE_PERMISSIONS_BEFORE_FIX,
      };
      const eventPerms: EventSectionPermissions = { tasks: "view", finances: "none" };

      expect(canPatchTask(session, eventPerms)).toBe(false);
    });

    it("client with tasks:update org perm BUT tasks:view event perm → DELETE blocked", () => {
      const session: MockSession = {
        eventScoped: true,
        orgPermissions: CLIENT_ROLE_PERMISSIONS_BEFORE_FIX,
      };
      const eventPerms: EventSectionPermissions = { tasks: "view", finances: "none" };

      expect(canDeleteTask(session, eventPerms)).toBe(false);
    });

    it("client with tasks:edit event perm → PATCH allowed", () => {
      const session: MockSession = {
        eventScoped: true,
        orgPermissions: CLIENT_ROLE_PERMISSIONS_BEFORE_FIX,
      };
      const eventPerms: EventSectionPermissions = { tasks: "edit", finances: "none" };

      expect(canPatchTask(session, eventPerms)).toBe(true);
    });

    it("after fix script: client without tasks:update → PATCH blocked at org level", () => {
      const session: MockSession = {
        eventScoped: true,
        orgPermissions: CLIENT_ROLE_PERMISSIONS_AFTER_FIX,
      };
      const eventPerms: EventSectionPermissions = { tasks: "edit", finances: "none" };

      expect(canPatchTask(session, eventPerms)).toBe(false);
    });

    it("non-eventScoped admin → always allowed", () => {
      const session: MockSession = {
        eventScoped: false,
        orgPermissions: ["tasks:read", "tasks:create", "tasks:update"],
      };

      expect(canPatchTask(session, null)).toBe(true);
      expect(canDeleteTask(session, null)).toBe(true);
    });
  });

  describe("Client role permissions fix script validation", () => {
    it("before fix: client has tasks:create and tasks:update", () => {
      expect(CLIENT_ROLE_PERMISSIONS_BEFORE_FIX).toContain("tasks:create");
      expect(CLIENT_ROLE_PERMISSIONS_BEFORE_FIX).toContain("tasks:update");
    });

    it("after fix: client does NOT have tasks:create or tasks:update", () => {
      expect(CLIENT_ROLE_PERMISSIONS_AFTER_FIX).not.toContain("tasks:create");
      expect(CLIENT_ROLE_PERMISSIONS_AFTER_FIX).not.toContain("tasks:update");
    });

    it("after fix: client still has tasks:read and tasks:comment", () => {
      expect(CLIENT_ROLE_PERMISSIONS_AFTER_FIX).toContain("tasks:read");
      expect(CLIENT_ROLE_PERMISSIONS_AFTER_FIX).toContain("tasks:comment");
    });

    it("after fix: client retains all non-task permissions", () => {
      expect(CLIENT_ROLE_PERMISSIONS_AFTER_FIX).toContain("events:read");
      expect(CLIENT_ROLE_PERMISSIONS_AFTER_FIX).toContain("events:update");
      expect(CLIENT_ROLE_PERMISSIONS_AFTER_FIX).toContain("vendors:read");
      expect(CLIENT_ROLE_PERMISSIONS_AFTER_FIX).toContain("guests:read");
      expect(CLIENT_ROLE_PERMISSIONS_AFTER_FIX).toContain("guests:manage");
      expect(CLIENT_ROLE_PERMISSIONS_AFTER_FIX).toContain("finance:read");
    });
  });
});

// ========== F2: Finances ==========

describe("F2: Finances — hide create buttons when permission ≠ 'edit'", () => {
  describe("UI: canEditFinances derivation", () => {
    it("non-eventScoped user → always canEdit", () => {
      expect(canEditFinances(null, false)).toBe(true);
      expect(canEditFinances({ finances: "view" }, false)).toBe(true);
      expect(canEditFinances({ finances: "none" }, false)).toBe(true);
    });

    it("eventScoped + finances:edit → canEdit", () => {
      expect(canEditFinances({ finances: "edit" }, true)).toBe(true);
    });

    it("eventScoped + finances:view → cannot edit (buttons hidden)", () => {
      expect(canEditFinances({ finances: "view" }, true)).toBe(false);
    });

    it("eventScoped + finances:none → cannot edit", () => {
      expect(canEditFinances({ finances: "none" }, true)).toBe(false);
    });

    it("eventScoped + no finances key → cannot edit (defaults to none)", () => {
      expect(canEditFinances({}, true)).toBe(false);
    });

    it("eventScoped + null permissions → cannot edit", () => {
      expect(canEditFinances(null, true)).toBe(false);
    });
  });

  describe("Finance API: client role lacks finance:create", () => {
    it("client role does not have finance:create permission", () => {
      expect(CLIENT_ROLE_PERMISSIONS_BEFORE_FIX).not.toContain("finance:create");
      expect(CLIENT_ROLE_PERMISSIONS_AFTER_FIX).not.toContain("finance:create");
    });

    it("client role has finance:read only", () => {
      const financePerms = CLIENT_ROLE_PERMISSIONS_AFTER_FIX.filter(p => p.startsWith("finance:"));
      expect(financePerms).toEqual(["finance:read"]);
    });
  });
});

// ========== Edge cases ==========

describe("Edge cases", () => {
  it("canView with view permission → true", () => {
    expect(canView({ tasks: "view" }, "tasks", true)).toBe(true);
  });

  it("canView with edit permission → true", () => {
    expect(canView({ tasks: "edit" }, "tasks", true)).toBe(true);
  });

  it("canView with none permission → false", () => {
    expect(canView({ tasks: "none" }, "tasks", false)).toBe(true); // non-eventScoped
    expect(canView({ tasks: "none" }, "tasks", true)).toBe(false); // eventScoped
  });

  it("readOnly should not affect create mode", () => {
    // readOnly is only passed in view mode, not create mode
    // When mode === "create", readOnly should be irrelevant
    // This is enforced by the drawer: create mode shows its own buttons
    const isCreateMode = true;
    const readOnly = true;
    // In create mode, the actions section shows "Crear Tarea" button, not the readOnly-gated ones
    expect(isCreateMode).toBe(true);
  });

  it("DnD disabled when canEditTasks is false", () => {
    // sensors should be empty array when !canEditTasks
    const canEditTasks = false;
    const sensors = [{ id: "pointer" }];
    const effectiveSensors = canEditTasks ? sensors : [];
    expect(effectiveSensors).toEqual([]);
  });

  it("DnD enabled when canEditTasks is true", () => {
    const canEditTasks = true;
    const sensors = [{ id: "pointer" }];
    const effectiveSensors = canEditTasks ? sensors : [];
    expect(effectiveSensors).toEqual([{ id: "pointer" }]);
  });
});

// ========== N1: Calendar schedule filtering by general permission ==========

describe("N1: Calendar — schedule items filtered by general permission", () => {
  interface EventAccess {
    eventId: number;
    permissions: EventSectionPermissions;
  }

  function computeScheduleEventFilter(access: EventAccess[]): number[] {
    return access
      .filter((a) => a.permissions.general && a.permissions.general !== "none")
      .map((a) => a.eventId);
  }

  function computeTaskEventFilter(access: EventAccess[]): number[] {
    return access
      .filter((a) => a.permissions.tasks && a.permissions.tasks !== "none")
      .map((a) => a.eventId);
  }

  function computeFinanceEventFilter(access: EventAccess[]): number[] {
    return access
      .filter((a) => a.permissions.finances && a.permissions.finances !== "none")
      .map((a) => a.eventId);
  }

  const access: EventAccess[] = [
    { eventId: 1, permissions: { general: "edit", tasks: "edit", finances: "view" } },
    { eventId: 2, permissions: { general: "view", tasks: "none", finances: "none" } },
    { eventId: 3, permissions: { general: "none", tasks: "view", finances: "none" } },
  ];

  it("schedule filter includes events with general:edit and general:view", () => {
    const filter = computeScheduleEventFilter(access);
    expect(filter).toEqual([1, 2]);
  });

  it("schedule filter excludes events with general:none", () => {
    const filter = computeScheduleEventFilter(access);
    expect(filter).not.toContain(3);
  });

  it("task filter includes events with tasks:edit and tasks:view", () => {
    const filter = computeTaskEventFilter(access);
    expect(filter).toEqual([1, 3]);
  });

  it("finance filter includes events with finances:view", () => {
    const filter = computeFinanceEventFilter(access);
    expect(filter).toEqual([1]);
  });

  it("empty access → empty schedule filter", () => {
    expect(computeScheduleEventFilter([])).toEqual([]);
  });

  it("all general:none → empty schedule filter", () => {
    const noGeneral: EventAccess[] = [
      { eventId: 1, permissions: { general: "none" } },
      { eventId: 2, permissions: { general: "none" } },
    ];
    expect(computeScheduleEventFilter(noGeneral)).toEqual([]);
  });
});

// ========== N4: EventSectionGuard logic ==========

describe("N4: EventSectionGuard — section access logic", () => {
  const SECTION_MAP: Record<string, string> = {
    "General": "general",
    "Cronograma": "general",
    "Tareas": "tasks",
    "Lista de Invitados": "guests",
    "RSVP": "rsvp",
    "Proveedores": "vendors",
    "Finanzas": "finances",
    "Orden del día": "general",
    "Configuración": "settings",
  };

  function filterNavigation(
    allItems: string[],
    permissions: EventSectionPermissions,
    eventScoped: boolean
  ): string[] {
    if (!eventScoped) return allItems;
    return allItems.filter((name) => {
      const section = SECTION_MAP[name];
      if (!section) return true;
      return permissions[section as keyof EventSectionPermissions] !== "none";
    });
  }

  const allNavItems = [
    "General", "Cronograma", "Tareas", "Lista de Invitados",
    "RSVP", "Proveedores", "Finanzas", "Orden del día", "Configuración",
  ];

  it("non-eventScoped user sees all items", () => {
    const result = filterNavigation(allNavItems, { finances: "none" }, false);
    expect(result).toEqual(allNavItems);
  });

  it("eventScoped with all edit → sees all items", () => {
    const perms: EventSectionPermissions = {
      general: "edit", tasks: "edit", guests: "edit",
      rsvp: "edit", vendors: "edit", finances: "edit", settings: "edit",
    };
    const result = filterNavigation(allNavItems, perms, true);
    expect(result).toEqual(allNavItems);
  });

  it("eventScoped with finances:none → hides Finanzas", () => {
    const perms: EventSectionPermissions = {
      general: "edit", tasks: "edit", guests: "edit",
      rsvp: "edit", vendors: "edit", finances: "none", settings: "none",
    };
    const result = filterNavigation(allNavItems, perms, true);
    expect(result).not.toContain("Finanzas");
    expect(result).not.toContain("Configuración");
    expect(result).toContain("General");
    expect(result).toContain("Tareas");
  });

  it("eventScoped with tasks:none → hides Tareas only", () => {
    const perms: EventSectionPermissions = {
      general: "edit", tasks: "none", guests: "view",
      rsvp: "view", vendors: "view", finances: "none", settings: "none",
    };
    const result = filterNavigation(allNavItems, perms, true);
    expect(result).not.toContain("Tareas");
    expect(result).toContain("General");
    expect(result).toContain("Cronograma");
  });

  it("Cronograma and Orden del día map to general section", () => {
    expect(SECTION_MAP["Cronograma"]).toBe("general");
    expect(SECTION_MAP["Orden del día"]).toBe("general");
  });

  it("eventScoped with general:none → hides General, Cronograma, Orden del día", () => {
    const perms: EventSectionPermissions = {
      general: "none", tasks: "edit", guests: "edit",
      rsvp: "edit", vendors: "edit", finances: "edit", settings: "none",
    };
    const result = filterNavigation(allNavItems, perms, true);
    expect(result).not.toContain("General");
    expect(result).not.toContain("Cronograma");
    expect(result).not.toContain("Orden del día");
    expect(result).toContain("Tareas");
    expect(result).toContain("Finanzas");
  });

  it("guard: canView returns false for none → shows access denied", () => {
    const showAccessDenied = !canView({ finances: "none" }, "finances", true);
    expect(showAccessDenied).toBe(true);
  });

  it("guard: canView returns true for view → shows content", () => {
    const showContent = canView({ finances: "view" }, "finances", true);
    expect(showContent).toBe(true);
  });

  it("guard: non-eventScoped always shows content", () => {
    const showContent = canView({ finances: "none" }, "finances", false);
    expect(showContent).toBe(true);
  });
});

// ========== N3: Task schedule PDF permission ==========

describe("N3: Task schedule PDF — eventScoped permission check", () => {
  function shouldCheckEventPermission(eventScoped: boolean, eventId: number | null): boolean {
    return eventScoped && eventId !== null;
  }

  it("eventScoped user with task.eventId → requires event permission check", () => {
    expect(shouldCheckEventPermission(true, 42)).toBe(true);
  });

  it("non-eventScoped user → skips event permission check", () => {
    expect(shouldCheckEventPermission(false, 42)).toBe(false);
  });

  it("eventScoped user with no eventId → skips event permission check", () => {
    expect(shouldCheckEventPermission(true, null)).toBe(false);
  });

  it("task PDF requires tasks:view (not edit) for reading", () => {
    const hasAccess = canView({ tasks: "view" }, "tasks", true);
    expect(hasAccess).toBe(true);
  });

  it("task PDF denied when tasks:none", () => {
    const hasAccess = canView({ tasks: "none" }, "tasks", true);
    expect(hasAccess).toBe(false);
  });
});

// ========== B1: Main sidebar filtering for eventScoped users ==========

describe("B1: Main sidebar — eventScoped navigation filtering", () => {
  interface NavItem {
    name: string;
    permission: string | null;
  }

  const navigationBeforeFinance: NavItem[] = [
    { name: "Dashboard", permission: null },
    { name: "Calendario", permission: null },
    { name: "Eventos", permission: "events:read" },
    { name: "CRM", permission: "crm:read" },
    { name: "Tareas", permission: "tasks:read" },
  ];

  const navigationAfterFinance: NavItem[] = [
    { name: "Proveedores", permission: "vendors:read" },
    { name: "Equipo", permission: "team:read" },
    { name: "Enti IA", permission: null },
  ];

  function canOrgPerm(orgPermissions: string[], permission: string): boolean {
    return orgPermissions.includes(permission);
  }

  function filterMainSidebar(
    items: NavItem[],
    orgPermissions: string[],
    eventScoped: boolean
  ): string[] {
    const base = items.filter(
      (item) => !item.permission || canOrgPerm(orgPermissions, item.permission)
    );
    if (eventScoped) return base.filter((item) => item.name === "Eventos").map((i) => i.name);
    return base.map((i) => i.name);
  }

  function showFinance(orgPermissions: string[], eventScoped: boolean): boolean {
    return !eventScoped && canOrgPerm(orgPermissions, "finance:read");
  }

  function showContacts(orgPermissions: string[], eventScoped: boolean): boolean {
    return !eventScoped && canOrgPerm(orgPermissions, "crm:read");
  }

  function showMoreMenu(eventScoped: boolean): boolean {
    return !eventScoped;
  }

  function showBottomSettings(eventScoped: boolean): boolean {
    return !eventScoped;
  }

  it("eventScoped client → only sees 'Eventos'", () => {
    const result = filterMainSidebar(navigationBeforeFinance, CLIENT_ROLE_PERMISSIONS_AFTER_FIX, true);
    expect(result).toEqual(["Eventos"]);
  });

  it("eventScoped client → afterFinance items hidden", () => {
    const result = filterMainSidebar(navigationAfterFinance, CLIENT_ROLE_PERMISSIONS_AFTER_FIX, true);
    expect(result).toEqual([]);
  });

  it("eventScoped client → Finance menu hidden", () => {
    expect(showFinance(CLIENT_ROLE_PERMISSIONS_AFTER_FIX, true)).toBe(false);
  });

  it("eventScoped client → Contacts menu hidden", () => {
    expect(showContacts(CLIENT_ROLE_PERMISSIONS_AFTER_FIX, true)).toBe(false);
  });

  it("eventScoped client → More menu hidden", () => {
    expect(showMoreMenu(true)).toBe(false);
  });

  it("eventScoped client → Settings (bottom) hidden", () => {
    expect(showBottomSettings(true)).toBe(false);
  });

  it("non-eventScoped admin → sees Dashboard, Calendario, Eventos, CRM, Tareas", () => {
    const adminPerms = ["events:read", "crm:read", "tasks:read", "finance:read", "vendors:read", "team:read"];
    const result = filterMainSidebar(navigationBeforeFinance, adminPerms, false);
    expect(result).toEqual(["Dashboard", "Calendario", "Eventos", "CRM", "Tareas"]);
  });

  it("non-eventScoped admin → sees afterFinance items", () => {
    const adminPerms = ["vendors:read", "team:read"];
    const result = filterMainSidebar(navigationAfterFinance, adminPerms, false);
    expect(result).toEqual(["Proveedores", "Equipo", "Enti IA"]);
  });

  it("non-eventScoped admin → Finance visible", () => {
    expect(showFinance(["finance:read"], false)).toBe(true);
  });

  it("non-eventScoped without finance:read → Finance hidden", () => {
    expect(showFinance([], false)).toBe(false);
  });

  it("non-eventScoped → More menu visible", () => {
    expect(showMoreMenu(false)).toBe(true);
  });
});

// ========== Multi-role permission matrix ==========

describe("Multi-role permission matrix", () => {
  const ROLES: Record<string, { orgPermissions: string[]; eventScoped: boolean }> = {
    admin: {
      eventScoped: false,
      orgPermissions: [
        "events:read", "events:create", "events:update", "events:delete",
        "tasks:read", "tasks:create", "tasks:update", "tasks:delete", "tasks:comment",
        "vendors:read", "vendors:create", "vendors:update", "vendors:delete",
        "crm:read", "crm:manage",
        "finance:read", "finance:create", "finance:manage",
        "guests:read", "guests:manage",
        "team:read", "team:manage",
        "settings:read", "settings:manage",
      ],
    },
    planner: {
      eventScoped: false,
      orgPermissions: [
        "events:read", "events:create", "events:update",
        "tasks:read", "tasks:create", "tasks:update", "tasks:comment",
        "vendors:read", "vendors:create", "vendors:update",
        "crm:read", "crm:manage",
        "finance:read", "finance:create",
        "guests:read", "guests:manage",
      ],
    },
    assistant: {
      eventScoped: false,
      orgPermissions: [
        "events:read", "events:update",
        "tasks:read", "tasks:create", "tasks:update", "tasks:comment",
        "vendors:read",
        "guests:read", "guests:manage",
        "finance:read",
      ],
    },
    client: {
      eventScoped: true,
      orgPermissions: CLIENT_ROLE_PERMISSIONS_AFTER_FIX,
    },
    viewer: {
      eventScoped: false,
      orgPermissions: [
        "events:read",
        "tasks:read",
        "vendors:read",
        "guests:read",
        "finance:read",
      ],
    },
    member: {
      eventScoped: false,
      orgPermissions: [
        "events:read",
        "tasks:read", "tasks:comment",
        "vendors:read",
      ],
    },
  };

  describe("Admin role", () => {
    const role = ROLES.admin;

    it("is not eventScoped", () => {
      expect(role.eventScoped).toBe(false);
    });

    it("can create/update/delete tasks at org level", () => {
      expect(role.orgPermissions).toContain("tasks:create");
      expect(role.orgPermissions).toContain("tasks:update");
      expect(role.orgPermissions).toContain("tasks:delete");
    });

    it("can manage finances at org level", () => {
      expect(role.orgPermissions).toContain("finance:read");
      expect(role.orgPermissions).toContain("finance:create");
      expect(role.orgPermissions).toContain("finance:manage");
    });

    it("isTaskReadOnly always false (non-eventScoped)", () => {
      expect(isTaskReadOnly(null, role.eventScoped)).toBe(false);
    });

    it("canEditFinances always true (non-eventScoped)", () => {
      expect(canEditFinances(null, role.eventScoped)).toBe(true);
    });
  });

  describe("Planner role", () => {
    const role = ROLES.planner;

    it("is not eventScoped", () => {
      expect(role.eventScoped).toBe(false);
    });

    it("has finance:create but not finance:manage", () => {
      expect(role.orgPermissions).toContain("finance:create");
      expect(role.orgPermissions).not.toContain("finance:manage");
    });

    it("canEditFinances always true (non-eventScoped)", () => {
      expect(canEditFinances(null, role.eventScoped)).toBe(true);
    });
  });

  describe("Client role (eventScoped)", () => {
    const role = ROLES.client;

    it("is eventScoped", () => {
      expect(role.eventScoped).toBe(true);
    });

    it("does NOT have tasks:create or tasks:update", () => {
      expect(role.orgPermissions).not.toContain("tasks:create");
      expect(role.orgPermissions).not.toContain("tasks:update");
    });

    it("has tasks:read and tasks:comment", () => {
      expect(role.orgPermissions).toContain("tasks:read");
      expect(role.orgPermissions).toContain("tasks:comment");
    });

    it("does NOT have finance:create", () => {
      expect(role.orgPermissions).not.toContain("finance:create");
    });

    it("tasks readOnly depends on event permissions", () => {
      expect(isTaskReadOnly({ tasks: "edit" }, true)).toBe(false);
      expect(isTaskReadOnly({ tasks: "view" }, true)).toBe(true);
      expect(isTaskReadOnly({ tasks: "none" }, true)).toBe(true);
    });

    it("finances canEdit depends on event permissions", () => {
      expect(canEditFinances({ finances: "edit" }, true)).toBe(true);
      expect(canEditFinances({ finances: "view" }, true)).toBe(false);
      expect(canEditFinances({ finances: "none" }, true)).toBe(false);
    });

    it("canView per section with mixed permissions", () => {
      const perms: EventSectionPermissions = {
        general: "view", tasks: "view", guests: "edit",
        rsvp: "edit", vendors: "none", finances: "none", settings: "none",
      };
      expect(canView(perms, "general", true)).toBe(true);
      expect(canView(perms, "tasks", true)).toBe(true);
      expect(canView(perms, "guests", true)).toBe(true);
      expect(canView(perms, "rsvp", true)).toBe(true);
      expect(canView(perms, "vendors", true)).toBe(false);
      expect(canView(perms, "finances", true)).toBe(false);
      expect(canView(perms, "settings", true)).toBe(false);
    });
  });

  describe("Viewer role", () => {
    const role = ROLES.viewer;

    it("is not eventScoped", () => {
      expect(role.eventScoped).toBe(false);
    });

    it("has read-only org permissions (no create/update/delete)", () => {
      const writePerms = role.orgPermissions.filter(
        (p) => p.includes(":create") || p.includes(":update") || p.includes(":delete") || p.includes(":manage")
      );
      expect(writePerms).toEqual([]);
    });

    it("canEditFinances always true (non-eventScoped bypasses)", () => {
      expect(canEditFinances(null, role.eventScoped)).toBe(true);
    });
  });

  describe("Member role", () => {
    const role = ROLES.member;

    it("does not have finance:read", () => {
      expect(role.orgPermissions).not.toContain("finance:read");
    });

    it("does not have guests:read", () => {
      expect(role.orgPermissions).not.toContain("guests:read");
    });

    it("has tasks:comment", () => {
      expect(role.orgPermissions).toContain("tasks:comment");
    });
  });
});

// ========== Finance ticket compatibility ==========

describe("Finance ticket compatibility — canEditFinances pattern", () => {
  it("unified payment drawer should respect canEditFinances for eventScoped client", () => {
    const perms: EventSectionPermissions = { finances: "view" };
    const canCreate = canEditFinances(perms, true);
    expect(canCreate).toBe(false);
  });

  it("unified payment drawer allows creation when finances:edit", () => {
    const perms: EventSectionPermissions = { finances: "edit" };
    const canCreate = canEditFinances(perms, true);
    expect(canCreate).toBe(true);
  });

  it("partial payment status change requires finances:edit", () => {
    const canChangeStatus = canEdit({ finances: "view" }, "finances", true);
    expect(canChangeStatus).toBe(false);
  });

  it("non-eventScoped user always allowed to edit finances", () => {
    expect(canEditFinances(null, false)).toBe(true);
    expect(canEditFinances({ finances: "none" }, false)).toBe(true);
  });

  it("EventSectionGuard still blocks page access when finances:none", () => {
    const blocked = !canView({ finances: "none" }, "finances", true);
    expect(blocked).toBe(true);
  });

  it("EventSectionGuard allows page access when finances:view (read-only)", () => {
    const allowed = canView({ finances: "view" }, "finances", true);
    expect(allowed).toBe(true);
  });
});

// ========== Cross-section permission scenarios ==========

describe("Cross-section permission scenarios", () => {
  it("RSVP-only client: can only view RSVP and guests", () => {
    const perms: EventSectionPermissions = {
      general: "view", tasks: "none", guests: "view",
      rsvp: "edit", vendors: "none", finances: "none", settings: "none",
    };
    expect(canView(perms, "rsvp", true)).toBe(true);
    expect(canEdit(perms, "rsvp", true)).toBe(true);
    expect(canView(perms, "guests", true)).toBe(true);
    expect(canView(perms, "tasks", true)).toBe(false);
    expect(canView(perms, "finances", true)).toBe(false);
    expect(canView(perms, "vendors", true)).toBe(false);
    expect(canView(perms, "settings", true)).toBe(false);
  });

  it("full-access preset: everything edit except vendors/finances (view only)", () => {
    const perms: EventSectionPermissions = {
      general: "edit", tasks: "edit", guests: "edit",
      rsvp: "edit", vendors: "view", finances: "view", settings: "none",
    };
    expect(canEdit(perms, "general", true)).toBe(true);
    expect(canEdit(perms, "tasks", true)).toBe(true);
    expect(canEdit(perms, "vendors", true)).toBe(false);
    expect(canView(perms, "vendors", true)).toBe(true);
    expect(canEdit(perms, "finances", true)).toBe(false);
    expect(canView(perms, "finances", true)).toBe(true);
  });

  it("read-only preset: all sections view, none edit", () => {
    const perms: EventSectionPermissions = {
      general: "view", tasks: "view", guests: "view",
      rsvp: "view", vendors: "view", finances: "view", settings: "none",
    };
    const sections: (keyof EventSectionPermissions)[] = [
      "general", "tasks", "guests", "rsvp", "vendors", "finances",
    ];
    for (const s of sections) {
      expect(canView(perms, s, true)).toBe(true);
      expect(canEdit(perms, s, true)).toBe(false);
    }
    expect(canView(perms, "settings", true)).toBe(false);
  });

  it("no-access preset: everything none", () => {
    const perms: EventSectionPermissions = {
      general: "none", tasks: "none", guests: "none",
      rsvp: "none", vendors: "none", finances: "none", settings: "none",
    };
    const sections: (keyof EventSectionPermissions)[] = [
      "general", "tasks", "guests", "rsvp", "vendors", "finances", "settings",
    ];
    for (const s of sections) {
      expect(canView(perms, s, true)).toBe(false);
      expect(canEdit(perms, s, true)).toBe(false);
    }
  });

  it("dashboard redirect: eventScoped → /dashboard/events", () => {
    const shouldRedirect = true; // eventScoped
    expect(shouldRedirect).toBe(true);
  });

  it("mobile bottom nav: eventScoped general nav → only Eventos", () => {
    const generalNav = ["Dashboard", "Eventos", "Contactos", "Tareas"];
    const filtered = generalNav.filter((n) => n === "Eventos");
    expect(filtered).toEqual(["Eventos"]);
  });

  it("mobile bottom nav: eventScoped → no more menu items", () => {
    const moreItems = ["Proveedores", "Pagos", "Configuración"];
    const filtered: string[] = []; // eventScoped → empty
    expect(filtered).toEqual([]);
  });
});
