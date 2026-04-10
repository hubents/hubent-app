/**
 * Tests for collaboration scope feature (guest task visibility).
 * Pure logic tests — no DB, no React rendering required.
 *
 * Validates:
 * - scope="full" → guest sees all event tasks
 * - scope="participant" → guest sees only tasks where they are task_participant
 * - Auto-add respects scope (skips participant scope)
 * - Missing scope defaults to "full" (backward compat)
 * - getCollaboratedTasks separates events by scope
 * - providerOrgId → vendorId resolution flow
 */
import { describe, it, expect } from "vitest";

// ========== Replicated Logic: Scope resolution ==========

type CollabScope = "full" | "participant";

interface CollabPermissions {
  scope?: CollabScope;
  tasks?: "view" | "edit" | "none";
  [key: string]: string | undefined;
}

function resolveScope(permissions: CollabPermissions | null): CollabScope {
  return (permissions?.scope as CollabScope) || "full";
}

// ========== Replicated Logic: Auto-add decision ==========

interface CollabEntry {
  guestOrgId: number | null;
  permissions: CollabPermissions | null;
}

function shouldAutoAdd(collab: CollabEntry): boolean {
  if (!collab.guestOrgId) return false;
  const scope = resolveScope(collab.permissions);
  if (scope === "participant") return false;
  const taskPerm = collab.permissions?.tasks;
  if (taskPerm === "none") return false;
  return true;
}

// ========== Replicated Logic: Guest task visibility filter ==========

interface TaskRow {
  id: number;
  eventId: number;
  organizationId: number;
  sharedWithHost: boolean;
}

interface TaskParticipantRow {
  taskId: number;
  collaboratorOrgId: number | null;
}

function filterGuestTasks(
  tasks: TaskRow[],
  participants: TaskParticipantRow[],
  guestOrgId: number,
  scope: CollabScope,
): TaskRow[] {
  const guestTaskIds = new Set(
    participants
      .filter((p) => p.collaboratorOrgId === guestOrgId)
      .map((p) => p.taskId),
  );

  return tasks.filter((t) => {
    if (t.organizationId === guestOrgId) return true;
    if (guestTaskIds.has(t.id)) return true;
    if (scope === "full") return true;
    return false;
  });
}

// ========== Replicated Logic: Scope-aware event separation ==========

interface CollabAccess {
  eventId: number;
  permissions: CollabPermissions | null;
}

function separateEventsByScope(collabs: CollabAccess[]): {
  fullScopeEventIds: number[];
  participantScopeEventIds: number[];
} {
  const fullScopeEventIds: number[] = [];
  const participantScopeEventIds: number[] = [];

  for (const c of collabs) {
    const scope = resolveScope(c.permissions);
    if (scope === "participant") {
      participantScopeEventIds.push(c.eventId);
    } else {
      fullScopeEventIds.push(c.eventId);
    }
  }

  return { fullScopeEventIds, participantScopeEventIds };
}

// ========== Replicated Logic: providerOrgId resolution ==========

function resolveVendorId(
  body: { vendorId?: number; providerOrgId?: number },
  vendorLookup: Map<number, number>,
): number | undefined {
  if (body.vendorId) return body.vendorId;
  if (body.providerOrgId) return vendorLookup.get(body.providerOrgId);
  return undefined;
}

// ==================== TESTS ====================

describe("Collaboration Scope — resolveScope", () => {
  it("returns 'full' when scope is explicitly set", () => {
    expect(resolveScope({ scope: "full", tasks: "view" })).toBe("full");
  });

  it("returns 'participant' when scope is set", () => {
    expect(resolveScope({ scope: "participant", tasks: "view" })).toBe("participant");
  });

  it("defaults to 'full' when scope is undefined", () => {
    expect(resolveScope({ tasks: "view" })).toBe("full");
  });

  it("defaults to 'full' when permissions is null", () => {
    expect(resolveScope(null)).toBe("full");
  });
});

describe("Collaboration Scope — Auto-add decision", () => {
  it("auto-adds for scope=full with tasks=view", () => {
    expect(
      shouldAutoAdd({ guestOrgId: 1, permissions: { scope: "full", tasks: "view" } }),
    ).toBe(true);
  });

  it("auto-adds for scope=full with tasks=edit", () => {
    expect(
      shouldAutoAdd({ guestOrgId: 1, permissions: { scope: "full", tasks: "edit" } }),
    ).toBe(true);
  });

  it("skips for scope=participant", () => {
    expect(
      shouldAutoAdd({ guestOrgId: 1, permissions: { scope: "participant", tasks: "view" } }),
    ).toBe(false);
  });

  it("skips when tasks=none regardless of scope", () => {
    expect(
      shouldAutoAdd({ guestOrgId: 1, permissions: { scope: "full", tasks: "none" } }),
    ).toBe(false);
  });

  it("skips when guestOrgId is null", () => {
    expect(
      shouldAutoAdd({ guestOrgId: null, permissions: { scope: "full", tasks: "view" } }),
    ).toBe(false);
  });

  it("auto-adds when scope is missing (backward compat)", () => {
    expect(
      shouldAutoAdd({ guestOrgId: 1, permissions: { tasks: "view" } }),
    ).toBe(true);
  });
});

describe("Collaboration Scope — Guest task visibility", () => {
  const hostOrg = 100;
  const guestOrg = 200;

  const eventTasks: TaskRow[] = [
    { id: 1, eventId: 10, organizationId: hostOrg, sharedWithHost: false },
    { id: 2, eventId: 10, organizationId: hostOrg, sharedWithHost: false },
    { id: 3, eventId: 10, organizationId: hostOrg, sharedWithHost: true },
    { id: 4, eventId: 10, organizationId: guestOrg, sharedWithHost: false },
  ];

  const participants: TaskParticipantRow[] = [
    { taskId: 1, collaboratorOrgId: guestOrg },
  ];

  it("scope=full → guest sees ALL tasks", () => {
    const visible = filterGuestTasks(eventTasks, participants, guestOrg, "full");
    expect(visible).toHaveLength(4);
  });

  it("scope=participant → guest sees only own + participant tasks", () => {
    const visible = filterGuestTasks(eventTasks, participants, guestOrg, "participant");
    expect(visible).toHaveLength(2);
    expect(visible.map((t) => t.id).sort()).toEqual([1, 4]);
  });

  it("scope=participant with no participants → guest sees only own tasks", () => {
    const visible = filterGuestTasks(eventTasks, [], guestOrg, "participant");
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe(4);
  });
});

describe("Collaboration Scope — Event separation", () => {
  it("separates full and participant scope events", () => {
    const collabs: CollabAccess[] = [
      { eventId: 1, permissions: { scope: "full", tasks: "view" } },
      { eventId: 2, permissions: { scope: "participant", tasks: "view" } },
      { eventId: 3, permissions: { tasks: "edit" } },
    ];

    const { fullScopeEventIds, participantScopeEventIds } = separateEventsByScope(collabs);
    expect(fullScopeEventIds).toEqual([1, 3]);
    expect(participantScopeEventIds).toEqual([2]);
  });

  it("all full scope when no participant scope", () => {
    const collabs: CollabAccess[] = [
      { eventId: 1, permissions: { scope: "full" } },
      { eventId: 2, permissions: null },
    ];

    const { fullScopeEventIds, participantScopeEventIds } = separateEventsByScope(collabs);
    expect(fullScopeEventIds).toEqual([1, 2]);
    expect(participantScopeEventIds).toEqual([]);
  });
});

describe("Collaboration Scope — providerOrgId resolution", () => {
  const vendorLookup = new Map<number, number>([
    [500, 10],
    [600, 20],
  ]);

  it("uses vendorId directly if provided", () => {
    expect(resolveVendorId({ vendorId: 99 }, vendorLookup)).toBe(99);
  });

  it("resolves providerOrgId to vendorId via lookup", () => {
    expect(resolveVendorId({ providerOrgId: 500 }, vendorLookup)).toBe(10);
  });

  it("returns undefined if providerOrgId not in lookup", () => {
    expect(resolveVendorId({ providerOrgId: 999 }, vendorLookup)).toBeUndefined();
  });

  it("vendorId takes precedence over providerOrgId", () => {
    expect(resolveVendorId({ vendorId: 99, providerOrgId: 500 }, vendorLookup)).toBe(99);
  });

  it("returns undefined if neither provided", () => {
    expect(resolveVendorId({}, vendorLookup)).toBeUndefined();
  });
});

describe("Collaboration Scope — Preset values", () => {
  const PRESETS = [
    { label: "Acceso completo", scope: "full" },
    { label: "Solo lectura", scope: "full" },
    { label: "Solo RSVP e Invitados", scope: "full" },
    { label: "Solo tareas invitado", scope: "participant" },
  ];

  it("all presets have a scope", () => {
    for (const preset of PRESETS) {
      expect(preset.scope).toBeDefined();
      expect(["full", "participant"]).toContain(preset.scope);
    }
  });

  it("only Solo tareas invitado has participant scope", () => {
    const participantPresets = PRESETS.filter((p) => p.scope === "participant");
    expect(participantPresets).toHaveLength(1);
    expect(participantPresets[0].label).toBe("Solo tareas invitado");
  });
});
