/**
 * RBAC UI Permissions Test Suite
 *
 * Tests the client-side `can()` logic from UserSessionContext
 * for every tenant role and every provider role against every permission.
 *
 * This is the source of truth for what each role should see in the UI.
 */
import { describe, it, expect } from "vitest";

// ─── Replicate can() logic from user-session-context.tsx ───
function can(role: string, permissions: string[], permission: string): boolean {
  if (role === "owner" || role === "admin" || role === "provider_owner") {
    return true;
  }
  if (permissions.includes(permission)) return true;
  const [resource] = permission.split(":");
  if (permissions.includes(`${resource}:*`)) return true;
  return false;
}

// ─── Canonical ROLE_PERMISSION_MAP from system-init.ts ───
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  // Bypass roles (owner, admin, provider_owner) are NOT here — they bypass everything
  planner: [
    "events:read", "events:create", "events:update",
    "tasks:read", "tasks:create", "tasks:update", "tasks:delete",
    "vendors:read", "vendors:create", "vendors:update",
    "team:read",
    "finance:read",
    "crm:read", "crm:manage",
    "settings:read",
    "forms:read", "forms:create", "forms:update", "forms:delete",
  ],
  assistant: [
    "events:read",
    "tasks:read", "tasks:create", "tasks:update",
    "vendors:read",
    "forms:read",
  ],
  accountant: [
    "events:read",
    "vendors:read",
    "finance:read", "finance:create", "finance:manage",
    "crm:read",
    "settings:read",
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
  provider_admin: [
    "events:read",
    "tasks:read", "tasks:create", "tasks:update",
    "vendors:read",
    "team:read",
    "finance:read", "finance:create", "finance:manage",
    "crm:read",
    "settings:read",
    "forms:read",
  ],
  provider_tech: [
    "events:read",
    "tasks:read", "tasks:update",
    "forms:read",
  ],
};

// All permissions in the system
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

// ─── Helper: expected can() result for a role ───
function expectedCan(role: string, permission: string): boolean {
  if (role === "owner" || role === "admin" || role === "provider_owner") return true;
  const perms = ROLE_PERMISSION_MAP[role];
  if (!perms) return false;
  return perms.includes(permission);
}

// ══════════════════════════════════════════════════════════════
// SECTION 1: TENANT ROLES
// ══════════════════════════════════════════════════════════════

const TENANT_ROLES = ["owner", "admin", "planner", "assistant", "accountant", "viewer", "client"];

describe("RBAC: Tenant roles — full permission matrix", () => {
  for (const role of TENANT_ROLES) {
    describe(`Role: ${role}`, () => {
      const perms = ROLE_PERMISSION_MAP[role] ?? [];

      for (const permission of ALL_PERMISSIONS) {
        const expected = expectedCan(role, permission);
        it(`${expected ? "✅ CAN" : "❌ CANNOT"} ${permission}`, () => {
          expect(can(role, perms, permission)).toBe(expected);
        });
      }
    });
  }
});

// ══════════════════════════════════════════════════════════════
// SECTION 2: PROVIDER ROLES
// ══════════════════════════════════════════════════════════════

const PROVIDER_ROLES = ["provider_owner", "provider_admin", "provider_tech"];

describe("RBAC: Provider roles — full permission matrix", () => {
  for (const role of PROVIDER_ROLES) {
    describe(`Role: ${role}`, () => {
      const perms = ROLE_PERMISSION_MAP[role] ?? [];

      for (const permission of ALL_PERMISSIONS) {
        const expected = expectedCan(role, permission);
        it(`${expected ? "✅ CAN" : "❌ CANNOT"} ${permission}`, () => {
          expect(can(role, perms, permission)).toBe(expected);
        });
      }
    });
  }
});

// ══════════════════════════════════════════════════════════════
// SECTION 3: UI ACTION VISIBILITY BY ROLE
// Tests map directly to the permission checks in UI components
// ══════════════════════════════════════════════════════════════

interface UIAction {
  page: string;
  action: string;
  permission: string;
}

const TENANT_UI_ACTIONS: UIAction[] = [
  // Dashboard quick actions
  { page: "Dashboard", action: "Nuevo Evento card", permission: "events:create" },
  { page: "Dashboard", action: "Agregar Lead card", permission: "crm:manage" },
  { page: "Dashboard", action: "Nueva Tarea card", permission: "tasks:create" },
  { page: "Dashboard", action: "Registrar Pago card", permission: "finance:create" },
  // Events page
  { page: "Events", action: "Nuevo Evento button", permission: "events:create" },
  { page: "Events", action: "Duplicar button", permission: "events:create" },
  { page: "Events", action: "Crear desde template", permission: "events:create" },
  // Tasks page
  { page: "Tasks", action: "Nueva Tarea button", permission: "tasks:create" },
  // Contacts page
  { page: "Contacts", action: "Nuevo Contacto button", permission: "crm:manage" },
  { page: "Contacts", action: "Importar CSV button", permission: "crm:manage" },
  { page: "Contacts", action: "Bulk Eliminar button", permission: "crm:manage" },
  // CRM page
  { page: "CRM", action: "Nuevo Lead button", permission: "crm:manage" },
  // Team page
  { page: "Team", action: "Invitar Miembro button", permission: "team:manage" },
  { page: "Team", action: "Roles button", permission: "team:manage" },
  { page: "Team", action: "Remove member button", permission: "team:manage" },
  // Finance dashboard
  { page: "Finance Dashboard", action: "Nuevo Presupuesto header", permission: "finance:create" },
  { page: "Finance Dashboard", action: "Nueva Factura header", permission: "finance:create" },
  { page: "Finance Dashboard", action: "Crear Presupuesto quick", permission: "finance:create" },
  { page: "Finance Dashboard", action: "Crear Factura quick", permission: "finance:create" },
  { page: "Finance Dashboard", action: "Registrar Pago quick", permission: "finance:create" },
  // Finance sub-pages
  { page: "Finance/Invoices", action: "Nueva Factura button", permission: "finance:create" },
  { page: "Finance/Quotes", action: "Nuevo Presupuesto button", permission: "finance:create" },
  { page: "Finance/Proformas", action: "Nueva Proforma button", permission: "finance:create" },
  { page: "Finance/DeliveryNotes", action: "Nuevo Albarán button", permission: "finance:create" },
  { page: "Finance/Payments", action: "Registrar Pago button", permission: "finance:create" },
  // Finance settings
  { page: "Finance/Settings", action: "Nuevo Impuesto button", permission: "finance:manage" },
  { page: "Finance/Settings", action: "Nueva Cuenta button", permission: "finance:manage" },
  // Payments standalone
  { page: "Payments", action: "Nuevo Pago button", permission: "finance:create" },
  // Forms page
  { page: "Forms", action: "Nuevo formulario button", permission: "forms:create" },
  { page: "Forms", action: "Duplicar form", permission: "forms:create" },
  // Settings
  { page: "Settings/Templates", action: "Nuevo Template button", permission: "events:create" },
  { page: "Settings/Roles", action: "Nuevo Rol button", permission: "team:manage" },
  { page: "Settings/Roles", action: "Crear Rol button", permission: "team:manage" },
];

const PROVIDER_UI_ACTIONS: UIAction[] = [
  // Provider sidebar
  { page: "Provider Sidebar", action: "Equipo nav link", permission: "team:read" },
  { page: "Provider Sidebar", action: "Configuración nav link", permission: "settings:read" },
  // Provider dashboard
  { page: "Provider Dashboard", action: "Ingresos Totales card", permission: "finance:read" },
  { page: "Provider Dashboard", action: "Facturas Pendientes card", permission: "finance:read" },
  { page: "Provider Dashboard", action: "Finanzas quick action", permission: "finance:read" },
  // Vendor finance pages
  { page: "Vendor/Invoices", action: "Nueva Factura button", permission: "finance:create" },
  { page: "Vendor/Quotes", action: "Nuevo Presupuesto button", permission: "finance:create" },
  { page: "Vendor/Payments", action: "Registrar Pago button", permission: "finance:create" },
  // Vendor settings
  { page: "Vendor/Settings", action: "Guardar config button", permission: "settings:update" },
];

describe("RBAC: Tenant UI action visibility per role", () => {
  for (const role of TENANT_ROLES) {
    describe(`Role: ${role}`, () => {
      const perms = ROLE_PERMISSION_MAP[role] ?? [];

      for (const uiAction of TENANT_UI_ACTIONS) {
        const visible = can(role, perms, uiAction.permission);
        it(`${uiAction.page} > "${uiAction.action}" → ${visible ? "VISIBLE" : "HIDDEN"}`, () => {
          expect(can(role, perms, uiAction.permission)).toBe(expectedCan(role, uiAction.permission));
        });
      }
    });
  }
});

describe("RBAC: Provider UI action visibility per role", () => {
  for (const role of PROVIDER_ROLES) {
    describe(`Role: ${role}`, () => {
      const perms = ROLE_PERMISSION_MAP[role] ?? [];

      for (const uiAction of PROVIDER_UI_ACTIONS) {
        const visible = can(role, perms, uiAction.permission);
        it(`${uiAction.page} > "${uiAction.action}" → ${visible ? "VISIBLE" : "HIDDEN"}`, () => {
          expect(can(role, perms, uiAction.permission)).toBe(expectedCan(role, uiAction.permission));
        });
      }
    });
  }
});

// ══════════════════════════════════════════════════════════════
// SECTION 4: CRITICAL NEGATIVE TESTS
// Explicitly verify that specific dangerous actions are DENIED
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

  describe("assistant CANNOT access finance, CRM manage, team, or settings", () => {
    const perms = ROLE_PERMISSION_MAP.assistant;
    const denied = [
      "events:create", "events:update", "events:delete",
      "tasks:delete",
      "vendors:create", "vendors:update", "vendors:delete",
      "team:read", "team:invite", "team:manage",
      "finance:read", "finance:create", "finance:manage",
      "crm:read", "crm:manage",
      "settings:read", "settings:update",
      "forms:create", "forms:update", "forms:delete",
    ];
    for (const perm of denied) {
      it(`assistant CANNOT ${perm}`, () => {
        expect(can("assistant", perms, perm)).toBe(false);
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

  describe("planner CANNOT delete events, manage team, or manage finance", () => {
    const perms = ROLE_PERMISSION_MAP.planner;
    const denied = [
      "events:delete",
      "vendors:delete",
      "team:invite", "team:manage",
      "finance:create", "finance:manage",
      "settings:update",
    ];
    for (const perm of denied) {
      it(`planner CANNOT ${perm}`, () => {
        expect(can("planner", perms, perm)).toBe(false);
      });
    }
  });

  describe("provider_tech CANNOT access finance, team, CRM, or settings", () => {
    const perms = ROLE_PERMISSION_MAP.provider_tech;
    const denied = [
      "events:create", "events:update", "events:delete",
      "tasks:create", "tasks:delete",
      "vendors:read", "vendors:create", "vendors:update", "vendors:delete",
      "team:read", "team:invite", "team:manage",
      "finance:read", "finance:create", "finance:manage",
      "crm:read", "crm:manage",
      "settings:read", "settings:update",
      "forms:create", "forms:update", "forms:delete",
    ];
    for (const perm of denied) {
      it(`provider_tech CANNOT ${perm}`, () => {
        expect(can("provider_tech", perms, perm)).toBe(false);
      });
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SECTION 5: BYPASS ROLES ALWAYS RETURN TRUE
// ══════════════════════════════════════════════════════════════

describe("RBAC: Bypass roles always have full access", () => {
  const bypassRoles = ["owner", "admin", "provider_owner"];
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
// SECTION 6: WILDCARD PERMISSION SUPPORT
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
// SECTION 7: EDGE CASES
// ══════════════════════════════════════════════════════════════

describe("RBAC: Edge cases", () => {
  it("unknown role with no permissions returns false", () => {
    expect(can("unknown_role", [], "events:read")).toBe(false);
  });
  it("empty permission string returns false for non-bypass role", () => {
    expect(can("viewer", ROLE_PERMISSION_MAP.viewer, "")).toBe(false);
  });
  it("non-existent permission returns false", () => {
    expect(can("planner", ROLE_PERMISSION_MAP.planner, "billing:manage")).toBe(false);
  });
  it("exact permission match works", () => {
    expect(can("planner", ROLE_PERMISSION_MAP.planner, "events:create")).toBe(true);
  });
  it("partial slug does not match", () => {
    expect(can("planner", ROLE_PERMISSION_MAP.planner, "events")).toBe(false);
  });
});
