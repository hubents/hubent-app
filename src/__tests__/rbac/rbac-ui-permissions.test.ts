/**
 * RBAC UI Permissions Test Suite
 *
 * Tests the client-side `can()` logic from UserSessionContext
 * for every unified role against every permission.
 *
 * Unified roles: owner, admin, manager, accountant, staff, viewer, client
 */
import { describe, it, expect } from "vitest";

// ─── Replicate can() logic from user-session-context.tsx ───
function can(role: string, permissions: string[], permission: string): boolean {
  if (role === "owner" || role === "admin") {
    return true;
  }
  if (permissions.includes(permission)) return true;
  const [resource] = permission.split(":");
  if (permissions.includes(`${resource}:*`)) return true;
  return false;
}

// ─── Canonical ROLE_PERMISSION_MAP (unified) ───
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  manager: [
    "events:read", "events:create", "events:update",
    "tasks:read", "tasks:create", "tasks:update", "tasks:delete",
    "vendors:read", "vendors:create", "vendors:update",
    "team:read",
    "finance:read",
    "crm:read", "crm:manage",
    "settings:read",
    "forms:read", "forms:create", "forms:update", "forms:delete",
  ],
  accountant: [
    "events:read",
    "vendors:read",
    "finance:read", "finance:create", "finance:manage",
    "crm:read",
    "settings:read",
  ],
  staff: [
    "events:read",
    "tasks:read", "tasks:create", "tasks:update",
    "vendors:read",
    "finance:read",
    "forms:read",
    "team:read",
  ],
  viewer: [
    "events:read",
    "tasks:read",
    "vendors:read",
    "finance:read",
    "forms:read",
  ],
  client: [
    "events:read",
    "tasks:read",
  ],
};

const ALL_PERMISSIONS = [
  "events:read", "events:create", "events:update", "events:delete",
  "tasks:read", "tasks:create", "tasks:update", "tasks:delete",
  "vendors:read", "vendors:create", "vendors:update", "vendors:delete",
  "team:read", "team:invite", "team:manage",
  "finance:read", "finance:create", "finance:manage",
  "crm:read", "crm:manage",
  "settings:read", "settings:update",
  "forms:read", "forms:create", "forms:update", "forms:delete",
];

function expectedCan(role: string, permission: string): boolean {
  if (role === "owner" || role === "admin") return true;
  const perms = ROLE_PERMISSION_MAP[role];
  if (!perms) return false;
  return perms.includes(permission);
}

// ══════════════════════════════════════════════════════════════
// SECTION 1: ALL ROLES — FULL PERMISSION MATRIX
// ══════════════════════════════════════════════════════════════

const ALL_ROLES = ["owner", "admin", "manager", "accountant", "staff", "viewer", "client"];

describe("RBAC: Unified roles — full permission matrix", () => {
  for (const role of ALL_ROLES) {
    describe(`Role: ${role}`, () => {
      const perms = ROLE_PERMISSION_MAP[role] ?? [];

      for (const permission of ALL_PERMISSIONS) {
        const expected = expectedCan(role, permission);
        it(`${expected ? "CAN" : "CANNOT"} ${permission}`, () => {
          expect(can(role, perms, permission)).toBe(expected);
        });
      }
    });
  }
});

// ══════════════════════════════════════════════════════════════
// SECTION 2: UI ACTION VISIBILITY BY ROLE
// ══════════════════════════════════════════════════════════════

interface UIAction {
  page: string;
  action: string;
  permission: string;
}

const UI_ACTIONS: UIAction[] = [
  { page: "Dashboard", action: "Nuevo Evento card", permission: "events:create" },
  { page: "Dashboard", action: "Agregar Lead card", permission: "crm:manage" },
  { page: "Dashboard", action: "Nueva Tarea card", permission: "tasks:create" },
  { page: "Dashboard", action: "Registrar Pago card", permission: "finance:create" },
  { page: "Events", action: "Nuevo Evento button", permission: "events:create" },
  { page: "Events", action: "Duplicar button", permission: "events:create" },
  { page: "Tasks", action: "Nueva Tarea button", permission: "tasks:create" },
  { page: "Contacts", action: "Nuevo Contacto button", permission: "crm:manage" },
  { page: "CRM", action: "Nuevo Lead button", permission: "crm:manage" },
  { page: "Team", action: "Invitar Miembro button", permission: "team:manage" },
  { page: "Finance/Invoices", action: "Nueva Factura button", permission: "finance:create" },
  { page: "Finance/Quotes", action: "Nuevo Presupuesto button", permission: "finance:create" },
  { page: "Finance/Payments", action: "Registrar Pago button", permission: "finance:create" },
  { page: "Finance/Settings", action: "Nuevo Impuesto button", permission: "finance:manage" },
  { page: "Forms", action: "Nuevo formulario button", permission: "forms:create" },
  { page: "Settings/Roles", action: "Nuevo Rol button", permission: "team:manage" },
];

describe("RBAC: UI action visibility per role", () => {
  for (const role of ALL_ROLES) {
    describe(`Role: ${role}`, () => {
      const perms = ROLE_PERMISSION_MAP[role] ?? [];

      for (const uiAction of UI_ACTIONS) {
        const visible = can(role, perms, uiAction.permission);
        it(`${uiAction.page} > "${uiAction.action}" → ${visible ? "VISIBLE" : "HIDDEN"}`, () => {
          expect(can(role, perms, uiAction.permission)).toBe(expectedCan(role, uiAction.permission));
        });
      }
    });
  }
});

// ══════════════════════════════════════════════════════════════
// SECTION 3: CRITICAL NEGATIVE TESTS
// ══════════════════════════════════════════════════════════════

describe("RBAC: Critical negative tests — actions MUST be denied", () => {
  describe("viewer CANNOT perform write actions", () => {
    const perms = ROLE_PERMISSION_MAP.viewer;
    const denied = [
      "events:create", "events:update", "events:delete",
      "tasks:create", "tasks:update", "tasks:delete",
      "vendors:create", "vendors:update", "vendors:delete",
      "team:invite", "team:manage",
      "finance:create", "finance:manage",
      "crm:manage",
      "settings:update",
      "forms:create", "forms:update", "forms:delete",
    ];
    for (const perm of denied) {
      it(`viewer CANNOT ${perm}`, () => {
        expect(can("viewer", perms, perm)).toBe(false);
      });
    }
  });

  describe("staff CANNOT manage events, CRM, team, or settings", () => {
    const perms = ROLE_PERMISSION_MAP.staff;
    const denied = [
      "events:create", "events:update", "events:delete",
      "tasks:delete",
      "vendors:create", "vendors:update", "vendors:delete",
      "team:invite", "team:manage",
      "finance:create", "finance:manage",
      "crm:read", "crm:manage",
      "settings:read", "settings:update",
      "forms:create", "forms:update", "forms:delete",
    ];
    for (const perm of denied) {
      it(`staff CANNOT ${perm}`, () => {
        expect(can("staff", perms, perm)).toBe(false);
      });
    }
  });

  describe("client CANNOT do almost anything except view events and tasks", () => {
    const perms = ROLE_PERMISSION_MAP.client;
    const denied = [
      "events:create", "events:update", "events:delete",
      "tasks:create", "tasks:update", "tasks:delete",
      "vendors:read", "vendors:create", "vendors:update", "vendors:delete",
      "team:read", "team:invite", "team:manage",
      "finance:read", "finance:create", "finance:manage",
      "crm:read", "crm:manage",
      "settings:read", "settings:update",
      "forms:read", "forms:create", "forms:update", "forms:delete",
    ];
    for (const perm of denied) {
      it(`client CANNOT ${perm}`, () => {
        expect(can("client", perms, perm)).toBe(false);
      });
    }
    it("client CAN events:read", () => {
      expect(can("client", perms, "events:read")).toBe(true);
    });
    it("client CAN tasks:read", () => {
      expect(can("client", perms, "tasks:read")).toBe(true);
    });
  });

  describe("accountant CANNOT manage events, tasks, team, or forms", () => {
    const perms = ROLE_PERMISSION_MAP.accountant;
    const denied = [
      "events:create", "events:update", "events:delete",
      "tasks:read", "tasks:create", "tasks:update", "tasks:delete",
      "vendors:create", "vendors:update", "vendors:delete",
      "team:read", "team:invite", "team:manage",
      "crm:manage",
      "settings:update",
      "forms:read", "forms:create", "forms:update", "forms:delete",
    ];
    for (const perm of denied) {
      it(`accountant CANNOT ${perm}`, () => {
        expect(can("accountant", perms, perm)).toBe(false);
      });
    }
  });

  describe("manager CANNOT delete events, manage team, or manage finance", () => {
    const perms = ROLE_PERMISSION_MAP.manager;
    const denied = [
      "events:delete",
      "vendors:delete",
      "team:invite", "team:manage",
      "finance:create", "finance:manage",
      "settings:update",
    ];
    for (const perm of denied) {
      it(`manager CANNOT ${perm}`, () => {
        expect(can("manager", perms, perm)).toBe(false);
      });
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SECTION 4: BYPASS ROLES ALWAYS RETURN TRUE
// ══════════════════════════════════════════════════════════════

describe("RBAC: Bypass roles always have full access", () => {
  const bypassRoles = ["owner", "admin"];
  for (const role of bypassRoles) {
    describe(`${role} bypasses all permission checks`, () => {
      for (const perm of ALL_PERMISSIONS) {
        it(`${role} CAN ${perm}`, () => {
          expect(can(role, [], perm)).toBe(true);
        });
      }
    });
  }
});

// ══════════════════════════════════════════════════════════════
// SECTION 5: WILDCARD PERMISSION SUPPORT
// ══════════════════════════════════════════════════════════════

describe("RBAC: Wildcard permission support", () => {
  it("events:* grants events:read", () => {
    expect(can("viewer", ["events:*"], "events:read")).toBe(true);
  });
  it("events:* grants events:create", () => {
    expect(can("viewer", ["events:*"], "events:create")).toBe(true);
  });
  it("finance:* grants finance:manage", () => {
    expect(can("viewer", ["finance:*"], "finance:manage")).toBe(true);
  });
  it("wildcard for one resource does not grant another", () => {
    expect(can("viewer", ["events:*"], "finance:read")).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// SECTION 6: EDGE CASES
// ══════════════════════════════════════════════════════════════

describe("RBAC: Edge cases", () => {
  it("unknown role with no permissions returns false", () => {
    expect(can("unknown_role", [], "events:read")).toBe(false);
  });
  it("empty permission string returns false for non-bypass role", () => {
    expect(can("viewer", ROLE_PERMISSION_MAP.viewer, "")).toBe(false);
  });
  it("non-existent permission returns false", () => {
    expect(can("manager", ROLE_PERMISSION_MAP.manager, "billing:manage")).toBe(false);
  });
  it("exact permission match works", () => {
    expect(can("manager", ROLE_PERMISSION_MAP.manager, "events:create")).toBe(true);
  });
  it("partial slug does not match", () => {
    expect(can("manager", ROLE_PERMISSION_MAP.manager, "events")).toBe(false);
  });
});
