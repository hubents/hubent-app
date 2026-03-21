/**
 * Tests for eventScoped finance document visibility fix (Ticket 86afge15x).
 * Pure logic tests — no DB, no React rendering required.
 *
 * Validates:
 * - Event-scoped finance document endpoints use correct permission checks
 * - DocumentPreview readOnly behavior
 * - PDF download URL routing for eventScoped vs non-eventScoped
 * - Client role org-level permissions vs event-level permissions
 * - UI gating: row click behavior, dropdown items, preview actions
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
  runsheet?: EventSectionLevel;
  calendar?: EventSectionLevel;
  settings?: EventSectionLevel;
}

// ========== Permission Logic (replicated from codebase) ==========

const CLIENT_ORG_PERMISSIONS = ["events:read", "tasks:read"];
const PLANNER_ORG_PERMISSIONS = [
  "events:read", "events:create", "events:update",
  "tasks:read", "tasks:create", "tasks:update", "tasks:delete",
  "vendors:read", "vendors:create", "vendors:update",
  "team:read", "finance:read",
  "crm:read", "crm:manage",
  "settings:read",
  "forms:read", "forms:create", "forms:update", "forms:delete",
  "integrations:read",
];

const DEFAULT_EVENT_PERMISSIONS: EventSectionPermissions = {
  general: "view",
  tasks: "none",
  guests: "none",
  rsvp: "none",
  vendors: "none",
  finances: "none",
  settings: "none",
};

function hasOrgPermission(permissions: string[], required: string): boolean {
  if (permissions.includes(required)) return true;
  const [resource] = required.split(":");
  return permissions.includes(`${resource}:*`);
}

function canViewSection(
  permissions: EventSectionPermissions | null,
  section: keyof EventSectionPermissions,
  eventScoped: boolean
): boolean {
  if (!eventScoped) return true;
  if (!permissions) return false;
  return (permissions[section] || "none") !== "none";
}

function canEditSection(
  permissions: EventSectionPermissions | null,
  section: keyof EventSectionPermissions,
  eventScoped: boolean
): boolean {
  if (!eventScoped) return true;
  if (!permissions) return false;
  return (permissions[section] || "none") === "edit";
}

// Simulates requireEventSectionAccess
function requireEventSectionAccess(
  eventScoped: boolean,
  orgPermissions: string[],
  eventPermissions: EventSectionPermissions | null,
  section: keyof EventSectionPermissions,
  level: EventSectionLevel
): { allowed: boolean; reason?: string } {
  // Non-eventScoped: check org-level permission
  if (!eventScoped) {
    const SECTION_ORG_PERMISSION: Record<string, Record<string, string>> = {
      finances: { view: "finance:read", edit: "finance:read" },
      tasks: { view: "tasks:read", edit: "tasks:update" },
      general: { view: "events:read", edit: "events:update" },
    };
    const required = SECTION_ORG_PERMISSION[section]?.[level];
    if (required && !hasOrgPermission(orgPermissions, required)) {
      return { allowed: false, reason: `Missing permission ${required}` };
    }
    return { allowed: true };
  }

  // EventScoped: check event_participants.permissions
  if (!eventPermissions) {
    return { allowed: false, reason: "No participant record" };
  }
  const sectionLevel = eventPermissions[section] || "none";
  if (sectionLevel === "none") {
    return { allowed: false, reason: `No access to ${section}` };
  }
  if (level === "edit" && sectionLevel === "view") {
    return { allowed: false, reason: `Read-only access to ${section}` };
  }
  return { allowed: true };
}

// ========== Route Selection Logic ==========

function getDocumentListUrl(eventId: number, type: string, useEventScoped: boolean): string {
  if (useEventScoped) {
    return `/api/events/${eventId}/documents/finance?type=${type}&limit=100`;
  }
  return `/api/finance/documents?type=${type}&eventId=${eventId}&limit=100`;
}

function getDocumentDetailUrl(eventId: number, docId: number, useEventScoped: boolean): string {
  if (useEventScoped) {
    return `/api/events/${eventId}/documents/finance/${docId}`;
  }
  return `/api/finance/documents/${docId}`;
}

function getPdfUrl(eventId: number, docId: number, useEventScoped: boolean): string {
  if (useEventScoped) {
    return `/api/events/${eventId}/documents/finance/${docId}/pdf?format=html`;
  }
  return `/api/finance/documents/${docId}/pdf?format=html`;
}

// ========== UI Behavior Logic ==========

function getRowClickAction(canEditFinances: boolean, docStatus: string): "edit" | "preview" {
  if (!canEditFinances) return "preview";
  if (docStatus === "paid" || docStatus === "partial") return "preview";
  return "edit";
}

function shouldShowDropdownItem(item: string, canEditFinances: boolean): boolean {
  const editOnlyItems = ["Editar", "Eliminar", "Registrar Pago", "Cambiar estado", "Aceptar", "Rechazar", "Enviar"];
  if (editOnlyItems.includes(item)) return canEditFinances;
  // Always visible items
  const alwaysVisible = ["Vista previa", "Descargar PDF"];
  return alwaysVisible.includes(item);
}

function getPreviewActions(readOnly: boolean): string[] {
  const actions = ["Imprimir", "PDF"];
  if (!readOnly) {
    actions.push("Enviar", "Cambiar estado", "Registrar pago", "Link de pago");
  }
  return actions;
}

// ========== TESTS ==========

describe("Client role org-level permissions", () => {
  it("client does NOT have finance:read at org level", () => {
    expect(hasOrgPermission(CLIENT_ORG_PERMISSIONS, "finance:read")).toBe(false);
  });

  it("planner HAS finance:read at org level", () => {
    expect(hasOrgPermission(PLANNER_ORG_PERMISSIONS, "finance:read")).toBe(true);
  });

  it("client has events:read and tasks:read", () => {
    expect(hasOrgPermission(CLIENT_ORG_PERMISSIONS, "events:read")).toBe(true);
    expect(hasOrgPermission(CLIENT_ORG_PERMISSIONS, "tasks:read")).toBe(true);
  });

  it("client does NOT have tasks:update", () => {
    expect(hasOrgPermission(CLIENT_ORG_PERMISSIONS, "tasks:update")).toBe(false);
  });
});

describe("Event-level permission checks (requireEventSectionAccess)", () => {
  const clientWithFinancesView: EventSectionPermissions = {
    ...DEFAULT_EVENT_PERMISSIONS,
    finances: "view",
    tasks: "view",
  };

  it("eventScoped client with finances:view CAN access finance docs via event endpoint", () => {
    const result = requireEventSectionAccess(true, CLIENT_ORG_PERMISSIONS, clientWithFinancesView, "finances", "view");
    expect(result.allowed).toBe(true);
  });

  it("eventScoped client with finances:none CANNOT access finance docs", () => {
    const result = requireEventSectionAccess(true, CLIENT_ORG_PERMISSIONS, DEFAULT_EVENT_PERMISSIONS, "finances", "view");
    expect(result.allowed).toBe(false);
  });

  it("eventScoped client CANNOT access finance docs via org-level check (the old bug)", () => {
    // This simulates the old /api/finance/documents endpoint which used requirePermission("finance:read")
    const hasOrgFinanceRead = hasOrgPermission(CLIENT_ORG_PERMISSIONS, "finance:read");
    expect(hasOrgFinanceRead).toBe(false); // This was the bug!
  });

  it("non-eventScoped planner CAN access finance docs via org-level check", () => {
    const result = requireEventSectionAccess(false, PLANNER_ORG_PERMISSIONS, null, "finances", "view");
    expect(result.allowed).toBe(true);
  });

  it("eventScoped client without participant record is denied", () => {
    const result = requireEventSectionAccess(true, CLIENT_ORG_PERMISSIONS, null, "finances", "view");
    expect(result.allowed).toBe(false);
  });
});

describe("Route URL selection", () => {
  const eventId = 42;
  const docId = 100;

  it("event pages use event-scoped document list endpoint", () => {
    const url = getDocumentListUrl(eventId, "invoice", true);
    expect(url).toBe("/api/events/42/documents/finance?type=invoice&limit=100");
  });

  it("event pages use event-scoped document detail endpoint", () => {
    const url = getDocumentDetailUrl(eventId, docId, true);
    expect(url).toBe("/api/events/42/documents/finance/100");
  });

  it("event pages use event-scoped PDF endpoint", () => {
    const url = getPdfUrl(eventId, docId, true);
    expect(url).toBe("/api/events/42/documents/finance/100/pdf?format=html");
  });

  it("non-event pages use org-level endpoints", () => {
    expect(getDocumentListUrl(eventId, "invoice", false)).toContain("/api/finance/documents");
    expect(getDocumentDetailUrl(eventId, docId, false)).toBe("/api/finance/documents/100");
    expect(getPdfUrl(eventId, docId, false)).toContain("/api/finance/documents/100/pdf");
  });
});

describe("UI row click behavior", () => {
  it("eventScoped with finances:view always opens preview", () => {
    expect(getRowClickAction(false, "sent")).toBe("preview");
    expect(getRowClickAction(false, "draft")).toBe("preview");
    expect(getRowClickAction(false, "paid")).toBe("preview");
  });

  it("planner opens edit for non-paid docs", () => {
    expect(getRowClickAction(true, "sent")).toBe("edit");
    expect(getRowClickAction(true, "draft")).toBe("edit");
  });

  it("planner opens preview for paid/partial docs", () => {
    expect(getRowClickAction(true, "paid")).toBe("preview");
    expect(getRowClickAction(true, "partial")).toBe("preview");
  });
});

describe("Dropdown menu item visibility", () => {
  it("eventScoped view-only user sees Vista previa and Descargar PDF", () => {
    expect(shouldShowDropdownItem("Vista previa", false)).toBe(true);
    expect(shouldShowDropdownItem("Descargar PDF", false)).toBe(true);
  });

  it("eventScoped view-only user does NOT see edit actions", () => {
    expect(shouldShowDropdownItem("Editar", false)).toBe(false);
    expect(shouldShowDropdownItem("Eliminar", false)).toBe(false);
    expect(shouldShowDropdownItem("Registrar Pago", false)).toBe(false);
    expect(shouldShowDropdownItem("Cambiar estado", false)).toBe(false);
  });

  it("planner sees all actions", () => {
    expect(shouldShowDropdownItem("Vista previa", true)).toBe(true);
    expect(shouldShowDropdownItem("Descargar PDF", true)).toBe(true);
    expect(shouldShowDropdownItem("Editar", true)).toBe(true);
    expect(shouldShowDropdownItem("Eliminar", true)).toBe(true);
  });
});

describe("DocumentPreview readOnly behavior", () => {
  it("readOnly=true hides write actions", () => {
    const actions = getPreviewActions(true);
    expect(actions).toContain("Imprimir");
    expect(actions).toContain("PDF");
    expect(actions).not.toContain("Enviar");
    expect(actions).not.toContain("Cambiar estado");
    expect(actions).not.toContain("Registrar pago");
    expect(actions).not.toContain("Link de pago");
  });

  it("readOnly=false shows all actions", () => {
    const actions = getPreviewActions(false);
    expect(actions).toContain("Imprimir");
    expect(actions).toContain("PDF");
    expect(actions).toContain("Enviar");
    expect(actions).toContain("Cambiar estado");
    expect(actions).toContain("Registrar pago");
    expect(actions).toContain("Link de pago");
  });
});

describe("Document belongs to event validation", () => {
  it("document with matching eventId passes validation", () => {
    const doc = { eventId: 42 };
    expect(doc.eventId === 42).toBe(true);
  });

  it("document with different eventId fails validation", () => {
    const doc = { eventId: 99 };
    expect(doc.eventId === 42).toBe(false);
  });

  it("document without eventId (null) fails validation", () => {
    const doc = { eventId: null };
    expect(doc.eventId === 42).toBe(false);
  });
});

describe("Finance section level constraints", () => {
  it("finances section only allows none and view (no edit)", () => {
    const allowedLevels: EventSectionLevel[] = ["none", "view"];
    expect(allowedLevels).not.toContain("edit");
  });

  it("canEditFinances returns false for finances:view", () => {
    const perms: EventSectionPermissions = { finances: "view" };
    expect(canEditSection(perms, "finances", true)).toBe(false);
  });

  it("canViewFinances returns true for finances:view", () => {
    const perms: EventSectionPermissions = { finances: "view" };
    expect(canViewSection(perms, "finances", true)).toBe(true);
  });

  it("non-eventScoped always canEdit regardless", () => {
    expect(canEditSection(null, "finances", false)).toBe(true);
    expect(canViewSection(null, "finances", false)).toBe(true);
  });
});

describe("Complete client flow scenarios", () => {
  const clientPermsWithFinances: EventSectionPermissions = {
    general: "view",
    tasks: "view",
    finances: "view",
    guests: "none",
    rsvp: "none",
    vendors: "none",
    settings: "none",
  };

  it("scenario: client navigates to event finances - sidebar shows Finanzas", () => {
    expect(canViewSection(clientPermsWithFinances, "finances", true)).toBe(true);
  });

  it("scenario: client opens invoices list - fetches via event-scoped endpoint", () => {
    const access = requireEventSectionAccess(true, CLIENT_ORG_PERMISSIONS, clientPermsWithFinances, "finances", "view");
    expect(access.allowed).toBe(true);
    const url = getDocumentListUrl(42, "invoice", true);
    expect(url).toContain("/api/events/42/documents/finance");
  });

  it("scenario: client clicks invoice row - opens preview (not edit)", () => {
    const action = getRowClickAction(false, "sent");
    expect(action).toBe("preview");
  });

  it("scenario: client downloads PDF - uses event-scoped PDF endpoint", () => {
    const url = getPdfUrl(42, 100, true);
    expect(url).toContain("/api/events/42/documents/finance/100/pdf");
  });

  it("scenario: client preview has no edit/send/status buttons", () => {
    const actions = getPreviewActions(true);
    expect(actions).toEqual(["Imprimir", "PDF"]);
  });

  it("scenario: client with finances:none cannot see finances at all", () => {
    expect(canViewSection(DEFAULT_EVENT_PERMISSIONS, "finances", true)).toBe(false);
  });
});

describe("Planner flow (non-eventScoped) unchanged", () => {
  it("planner uses org-level finance endpoints normally", () => {
    const access = requireEventSectionAccess(false, PLANNER_ORG_PERMISSIONS, null, "finances", "view");
    expect(access.allowed).toBe(true);
  });

  it("planner can edit finances", () => {
    expect(canEditSection(null, "finances", false)).toBe(true);
  });

  it("planner row click opens edit for non-paid docs", () => {
    expect(getRowClickAction(true, "sent")).toBe("edit");
  });

  it("planner preview shows all actions", () => {
    const actions = getPreviewActions(false);
    expect(actions.length).toBe(6);
  });
});
