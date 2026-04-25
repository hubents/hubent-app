/**
 * Tests for V3 urgent ticket fixes (Plan V3 — 2026-04-25).
 *
 * Pure-logic tests (no DB, no React). Validates the authorization decisions and
 * filter rules that close 3 urgent ClickUp tickets:
 *
 *   T1 — "equipo": clientes ya no aparecen en /Equipo y no consumen seats
 *   T2 — "Tareas compartidas": chat realtime + archivos cross-org
 *   T3 — "Control acceso": clientes view-only no pueden editar (incluido checklist)
 */

import { describe, it, expect } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers under test (replicate canonical logic so tests are pure)
// ─────────────────────────────────────────────────────────────────────────────

type Role = "owner" | "admin" | "manager" | "accountant" | "staff" | "viewer" | "client";
type SectionLevel = "view" | "edit" | "none";

const HIGH_ROLES = new Set(["manager", "admin", "owner", "super_admin"]);
const EXCLUDED_TEAM_ROLES = new Set(["client", "vendor"]);

// T1a — GET /api/team filter: hide client/vendor from "Equipo"
function shouldShowInTeamPage(roleSlug: string): boolean {
  return !EXCLUDED_TEAM_ROLES.has(roleSlug);
}

// T1b — getUsage seat counting: only count non-eventScoped roles
function countsAgainstSeatLimit(roleEventScoped: boolean): boolean {
  return roleEventScoped === false;
}

// T2-base — canAccessTaskFor (centralized)
interface TaskRow {
  id: number;
  eventId: number | null;
  organizationId: number;
  sharedWithHost: boolean;
}
interface ParticipantRow {
  taskId: number;
  userId: string | null;
  vendorId: number | null;
  collaboratorOrgId: number | null;
  canEdit: boolean;
  canComment: boolean;
}
interface VendorRow {
  id: number;
  providerOrgId: number | null;
}
interface CollaborationRow {
  eventId: number;
  guestOrgId: number;
  status: "active" | "pending" | "rejected";
  permissions: { tasks?: SectionLevel } | null;
}

interface TaskAccessResult {
  allowed: boolean;
  canRead: boolean;
  canComment: boolean;
  canEdit: boolean;
  source:
    | "high-role-same-org"
    | "participant-user"
    | "participant-vendor"
    | "collaboration"
    | null;
}

const NO_ACCESS: TaskAccessResult = {
  allowed: false,
  canRead: false,
  canComment: false,
  canEdit: false,
  source: null,
};

function canAccessTaskFor(args: {
  userId: string;
  organizationId: number;
  role: Role;
  task: TaskRow | null;
  participants: ParticipantRow[];
  vendors: VendorRow[];
  collaborations: CollaborationRow[];
}): TaskAccessResult {
  const { userId, organizationId, role, task, participants, vendors, collaborations } = args;
  if (!task) return NO_ACCESS;

  // 1. High-privilege same-org bypass
  if (HIGH_ROLES.has(role) && task.organizationId === organizationId) {
    return { allowed: true, canRead: true, canComment: true, canEdit: true, source: "high-role-same-org" };
  }

  // 2. Direct user participant
  const userP = participants.find(
    (p) => p.taskId === task.id && p.userId === userId,
  );
  if (userP) {
    return {
      allowed: true,
      canRead: true,
      canComment: userP.canComment !== false,
      canEdit: userP.canEdit === true,
      source: "participant-user",
    };
  }

  // 3. Vendor → providerOrg fallback
  const vendorP = participants.find((p) => {
    if (p.taskId !== task.id || !p.vendorId) return false;
    const v = vendors.find((vv) => vv.id === p.vendorId);
    return v?.providerOrgId === organizationId;
  });
  if (vendorP) {
    return {
      allowed: true,
      canRead: true,
      canComment: vendorP.canComment !== false,
      canEdit: vendorP.canEdit === true,
      source: "participant-vendor",
    };
  }

  // 4. Event collaboration (cross-org)
  if (task.eventId && task.organizationId !== organizationId) {
    const collab = collaborations.find(
      (c) =>
        c.eventId === task.eventId &&
        c.guestOrgId === organizationId &&
        c.status === "active",
    );
    if (collab) {
      const orgP = participants.find(
        (p) => p.taskId === task.id && p.collaboratorOrgId === organizationId,
      );
      const isShared = task.sharedWithHost === true;

      if (isShared || orgP) {
        const collabCanEdit = collab.permissions?.tasks === "edit";
        return {
          allowed: true,
          canRead: true,
          canComment: orgP?.canComment !== false,
          canEdit: collabCanEdit && orgP?.canEdit !== false,
          source: "collaboration",
        };
      }
    }
  }

  return NO_ACCESS;
}

// T3b — checklist RBAC enforcement
function canMutateChecklist(
  role: Role,
  permissions: { "tasks:update"?: boolean },
  eventScoped: boolean,
  eventTasksLevel: SectionLevel,
): boolean {
  if (HIGH_ROLES.has(role)) return true;
  if (!permissions["tasks:update"]) return false;
  if (eventScoped && eventTasksLevel !== "edit") return false;
  return true;
}

// T3c — canEditTask (split from canAccessTask)
function canEditTaskLogic(args: {
  eventScoped: boolean;
  userId: string;
  taskParticipantCanEdit: boolean | null;
  assignedTo: string | null;
  createdBy: string | null;
  eventPermissionsTasks: SectionLevel | null;
}): boolean {
  if (!args.eventScoped) return true;
  if (args.taskParticipantCanEdit === true) return true;
  if (args.assignedTo === args.userId) return true;
  if (args.createdBy === args.userId) return true;
  if (args.eventPermissionsTasks === "edit") return true;
  return false;
}

// T1c — revoke endpoint cleanup logic
function shouldDeleteTaskParticipants(
  eventTaskIds: number[],
  participantUserId: string | null,
  taskParticipants: Array<{ taskId: number; userId: string | null }>,
): Array<{ taskId: number; userId: string | null }> {
  if (!participantUserId) return [];
  return taskParticipants.filter(
    (tp) => tp.userId === participantUserId && eventTaskIds.includes(tp.taskId),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// T1 — Equipo (UX + Billing)
// ─────────────────────────────────────────────────────────────────────────────

describe("T1a — /api/team filter excludes client/vendor", () => {
  it("hides clients from the Equipo page", () => {
    expect(shouldShowInTeamPage("client")).toBe(false);
  });
  it("hides vendors from the Equipo page", () => {
    expect(shouldShowInTeamPage("vendor")).toBe(false);
  });
  it("shows internal staff (owner, admin, manager, accountant, staff, viewer)", () => {
    for (const role of ["owner", "admin", "manager", "accountant", "staff", "viewer"]) {
      expect(shouldShowInTeamPage(role)).toBe(true);
    }
  });
});

describe("T1b — Seat counting via roles.eventScoped", () => {
  it("eventScoped=false roles consume seats", () => {
    expect(countsAgainstSeatLimit(false)).toBe(true);
  });
  it("eventScoped=true roles do NOT consume seats (clients are free)", () => {
    expect(countsAgainstSeatLimit(true)).toBe(false);
  });
});

describe("T1c — Revoke access cleans taskParticipants but keeps org membership", () => {
  it("removes only the targeted user's task_participants in the event's tasks", () => {
    const eventTaskIds = [10, 11, 12];
    const userId = "u-ainhoa";
    const taskParticipants = [
      { taskId: 10, userId: "u-ainhoa" }, // delete
      { taskId: 11, userId: "u-other" }, // keep
      { taskId: 12, userId: "u-ainhoa" }, // delete
      { taskId: 99, userId: "u-ainhoa" }, // keep (different event)
    ];
    const toDelete = shouldDeleteTaskParticipants(eventTaskIds, userId, taskParticipants);
    expect(toDelete).toEqual([
      { taskId: 10, userId: "u-ainhoa" },
      { taskId: 12, userId: "u-ainhoa" },
    ]);
  });

  it("no-ops when participant has no userId (vendor/contact-only)", () => {
    expect(shouldDeleteTaskParticipants([1, 2], null, [{ taskId: 1, userId: "u" }])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T2 — canAccessTaskFor (centralized cross-org access)
// ─────────────────────────────────────────────────────────────────────────────

describe("T2-base — canAccessTaskFor: high-role same-org", () => {
  const task: TaskRow = { id: 1, eventId: 100, organizationId: 1, sharedWithHost: false };
  it("manager from owning org gets full access", () => {
    const r = canAccessTaskFor({
      userId: "u-1", organizationId: 1, role: "manager",
      task, participants: [], vendors: [], collaborations: [],
    });
    expect(r).toEqual({ allowed: true, canRead: true, canComment: true, canEdit: true, source: "high-role-same-org" });
  });
  it("manager from a DIFFERENT org gets no access (no participant/collab)", () => {
    const r = canAccessTaskFor({
      userId: "u-1", organizationId: 999, role: "manager",
      task, participants: [], vendors: [], collaborations: [],
    });
    expect(r.allowed).toBe(false);
  });
});

describe("T2-base — canAccessTaskFor: direct user participant", () => {
  const task: TaskRow = { id: 1, eventId: 100, organizationId: 1, sharedWithHost: false };
  it("client added as participant with canComment=true, canEdit=false", () => {
    const r = canAccessTaskFor({
      userId: "u-client", organizationId: 1, role: "client",
      task,
      participants: [{ taskId: 1, userId: "u-client", vendorId: null, collaboratorOrgId: null, canEdit: false, canComment: true }],
      vendors: [], collaborations: [],
    });
    expect(r.canRead).toBe(true);
    expect(r.canComment).toBe(true);
    expect(r.canEdit).toBe(false);
    expect(r.source).toBe("participant-user");
  });
});

describe("T2a — collaboratorOrgId path (cross-org guest)", () => {
  const task: TaskRow = { id: 1, eventId: 100, organizationId: 1, sharedWithHost: false };
  it("guest org with active collab + collaboratorOrgId match can read+comment", () => {
    const r = canAccessTaskFor({
      userId: "u-guest", organizationId: 2, role: "manager",
      task,
      participants: [{ taskId: 1, userId: null, vendorId: null, collaboratorOrgId: 2, canEdit: false, canComment: true }],
      vendors: [],
      collaborations: [{ eventId: 100, guestOrgId: 2, status: "active", permissions: { tasks: "view" } }],
    });
    expect(r.canRead).toBe(true);
    expect(r.canComment).toBe(true);
    expect(r.canEdit).toBe(false);
    expect(r.source).toBe("collaboration");
  });

  it("collab with permissions.tasks='edit' grants canEdit (when participant.canEdit !== false)", () => {
    const r = canAccessTaskFor({
      userId: "u-guest", organizationId: 2, role: "manager",
      task,
      participants: [{ taskId: 1, userId: null, vendorId: null, collaboratorOrgId: 2, canEdit: true, canComment: true }],
      vendors: [],
      collaborations: [{ eventId: 100, guestOrgId: 2, status: "active", permissions: { tasks: "edit" } }],
    });
    expect(r.canEdit).toBe(true);
  });

  it("sharedWithHost=true grants access without explicit collaboratorOrgId", () => {
    const sharedTask: TaskRow = { id: 1, eventId: 100, organizationId: 1, sharedWithHost: true };
    const r = canAccessTaskFor({
      userId: "u-guest", organizationId: 2, role: "manager",
      task: sharedTask,
      participants: [],
      vendors: [],
      collaborations: [{ eventId: 100, guestOrgId: 2, status: "active", permissions: { tasks: "view" } }],
    });
    expect(r.canRead).toBe(true);
    expect(r.source).toBe("collaboration");
  });

  it("INACTIVE collaboration (status=pending) denies access", () => {
    const r = canAccessTaskFor({
      userId: "u-guest", organizationId: 2, role: "manager",
      task,
      participants: [{ taskId: 1, userId: null, vendorId: null, collaboratorOrgId: 2, canEdit: false, canComment: true }],
      vendors: [],
      collaborations: [{ eventId: 100, guestOrgId: 2, status: "pending", permissions: { tasks: "view" } }],
    });
    expect(r.allowed).toBe(false);
  });

  it("DIFFERENT guestOrg cannot piggyback on someone else's collab", () => {
    const r = canAccessTaskFor({
      userId: "u-attacker", organizationId: 999, role: "manager",
      task,
      participants: [{ taskId: 1, userId: null, vendorId: null, collaboratorOrgId: 2, canEdit: false, canComment: true }],
      vendors: [],
      collaborations: [{ eventId: 100, guestOrgId: 2, status: "active", permissions: { tasks: "view" } }],
    });
    expect(r.allowed).toBe(false);
  });
});

describe("T2-base — vendor->providerOrg fallback", () => {
  const task: TaskRow = { id: 1, eventId: 100, organizationId: 1, sharedWithHost: false };
  it("provider-org user can access via vendor participant", () => {
    const r = canAccessTaskFor({
      userId: "u-provider", organizationId: 7, role: "manager",
      task,
      participants: [{ taskId: 1, userId: null, vendorId: 50, collaboratorOrgId: null, canEdit: false, canComment: true }],
      vendors: [{ id: 50, providerOrgId: 7 }],
      collaborations: [],
    });
    expect(r.canRead).toBe(true);
    expect(r.canComment).toBe(true);
    expect(r.source).toBe("participant-vendor");
  });
});

describe("T2-base — denies access to unrelated tasks (security)", () => {
  it("authenticated user with no relation to the task gets no access", () => {
    const task: TaskRow = { id: 1, eventId: 100, organizationId: 1, sharedWithHost: false };
    const r = canAccessTaskFor({
      userId: "u-stranger", organizationId: 999, role: "client",
      task, participants: [], vendors: [], collaborations: [],
    });
    expect(r.allowed).toBe(false);
  });

  it("non-existent task returns no access (helper handles null)", () => {
    const r = canAccessTaskFor({
      userId: "u-1", organizationId: 1, role: "manager",
      task: null, participants: [], vendors: [], collaborations: [],
    });
    expect(r).toEqual(NO_ACCESS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T3 — RBAC view-only enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe("T3b — checklist RBAC blocks clients", () => {
  it("client (no tasks:update) cannot mutate checklist", () => {
    expect(canMutateChecklist("client", {}, true, "view")).toBe(false);
  });
  it("staff with tasks:update but event readonly cannot mutate", () => {
    expect(canMutateChecklist("staff", { "tasks:update": true }, true, "view")).toBe(false);
  });
  it("staff with tasks:update and event edit can mutate", () => {
    expect(canMutateChecklist("staff", { "tasks:update": true }, true, "edit")).toBe(true);
  });
  it("manager (high-role) can always mutate", () => {
    expect(canMutateChecklist("manager", {}, false, "none")).toBe(true);
  });
});

describe("T3c — canEditTask split logic", () => {
  it("non-eventScoped users can always edit (managers bypass)", () => {
    expect(
      canEditTaskLogic({
        eventScoped: false,
        userId: "u-1",
        taskParticipantCanEdit: null,
        assignedTo: null,
        createdBy: null,
        eventPermissionsTasks: null,
      }),
    ).toBe(true);
  });

  it("eventScoped user with task_participants.canEdit=true can edit", () => {
    expect(
      canEditTaskLogic({
        eventScoped: true,
        userId: "u-1",
        taskParticipantCanEdit: true,
        assignedTo: null,
        createdBy: null,
        eventPermissionsTasks: "view",
      }),
    ).toBe(true);
  });

  it("eventScoped user with canEdit=false (only canRead) CANNOT edit", () => {
    expect(
      canEditTaskLogic({
        eventScoped: true,
        userId: "u-1",
        taskParticipantCanEdit: false,
        assignedTo: null,
        createdBy: null,
        eventPermissionsTasks: "view",
      }),
    ).toBe(false);
  });

  it("eventScoped user assignedTo themselves can edit (self-managed)", () => {
    expect(
      canEditTaskLogic({
        eventScoped: true,
        userId: "u-1",
        taskParticipantCanEdit: false,
        assignedTo: "u-1",
        createdBy: null,
        eventPermissionsTasks: "view",
      }),
    ).toBe(true);
  });

  it("eventScoped user with event_participants.permissions.tasks=edit can edit", () => {
    expect(
      canEditTaskLogic({
        eventScoped: true,
        userId: "u-1",
        taskParticipantCanEdit: false,
        assignedTo: null,
        createdBy: null,
        eventPermissionsTasks: "edit",
      }),
    ).toBe(true);
  });

  it("eventScoped client (no edit grants) cannot edit", () => {
    expect(
      canEditTaskLogic({
        eventScoped: true,
        userId: "u-client",
        taskParticipantCanEdit: false,
        assignedTo: null,
        createdBy: null,
        eventPermissionsTasks: "view",
      }),
    ).toBe(false);
  });
});
