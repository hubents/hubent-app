import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "../../..");

describe("Schema: event_collaborations table", () => {
  const schema = fs.readFileSync(path.join(ROOT, "src/db/schema.ts"), "utf-8");

  it("defines eventCollaborations table", () => {
    expect(schema).toContain('export const eventCollaborations = pgTable("event_collaborations"');
  });

  it("has hostOrgId and guestOrgId (neutral naming, no planner/provider)", () => {
    expect(schema).toContain('hostOrgId: integer("host_org_id")');
    expect(schema).toContain('guestOrgId: integer("guest_org_id")');
  });

  it("has permissions JSON with partners key (not vendors)", () => {
    expect(schema).toContain("partners");
    const collabBlock = schema.split("eventCollaborations")[1]?.split("});")[0] || "";
    expect(collabBlock).toContain("partners");
  });

  it("has status field with default pending", () => {
    const collabBlock = schema.split("eventCollaborations")[1]?.split("});")[0] || "";
    expect(collabBlock).toContain('.default("pending")');
  });

  it("has invitationEmail and invitationToken for unregistered orgs", () => {
    const collabBlock = schema.split("eventCollaborations")[1]?.split("});")[0] || "";
    expect(collabBlock).toContain("invitation_email");
    expect(collabBlock).toContain("invitation_token");
  });

  it("tasks table has sharedWithHost field", () => {
    expect(schema).toContain('sharedWithHost: boolean("shared_with_host")');
  });

  it("taskParticipants has collaboratorOrgId field", () => {
    expect(schema).toContain('collaboratorOrgId: integer("collaborator_org_id")');
  });
});

describe("Migration: 0059_event_collaborations.sql", () => {
  const sql = fs.readFileSync(path.join(ROOT, "drizzle/0059_event_collaborations.sql"), "utf-8");

  it("creates event_collaborations table with IF NOT EXISTS", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS event_collaborations");
  });

  it("has UNIQUE constraint on (event_id, guest_org_id)", () => {
    expect(sql).toContain("UNIQUE(event_id, guest_org_id)");
  });

  it("migrates data from provider_event_access", () => {
    expect(sql).toContain("FROM provider_event_access");
    expect(sql).toContain("ON CONFLICT (event_id, guest_org_id) DO NOTHING");
  });

  it("adds shared_with_host to tasks", () => {
    expect(sql).toContain("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS shared_with_host");
  });

  it("adds collaborator_org_id to task_participants", () => {
    expect(sql).toContain("ALTER TABLE task_participants ADD COLUMN IF NOT EXISTS collaborator_org_id");
  });

  it("creates performance indexes", () => {
    expect(sql).toContain("idx_event_collaborations_guest_org");
    expect(sql).toContain("idx_event_collaborations_event");
  });
});

describe("API: POST /api/events/[eventId]/providers — dual-write bridge", () => {
  const content = fs.readFileSync(
    path.join(ROOT, "src/app/api/events/[eventId]/providers/route.ts"),
    "utf-8"
  );

  it("imports eventCollaborations for dual-write", () => {
    expect(content).toContain("eventCollaborations");
  });

  it("inserts into event_collaborations after provider_event_access", () => {
    const peaInsertIdx = content.indexOf("insert(providerEventAccess)");
    const ecInsertIdx = content.indexOf("insert(eventCollaborations)");
    expect(peaInsertIdx).toBeGreaterThan(-1);
    expect(ecInsertIdx).toBeGreaterThan(-1);
    expect(ecInsertIdx).toBeGreaterThan(peaInsertIdx);
  });

  it("uses onConflictDoNothing for idempotent dual-write", () => {
    expect(content).toContain("onConflictDoNothing");
  });

  it("sets active status and default permissions on event_collaborations insert", () => {
    const ecBlock = content.split("insert(eventCollaborations)")[1]?.split("onConflictDoNothing")[0] || "";
    expect(ecBlock).toContain('"active"');
    expect(ecBlock).toContain("general");
    expect(ecBlock).toContain("tasks");
  });
});

describe("API: POST /api/events/[eventId]/partners", () => {
  const content = fs.readFileSync(
    path.join(ROOT, "src/app/api/events/[eventId]/partners/route.ts"),
    "utf-8"
  );

  it("exports GET and POST handlers", () => {
    expect(content).toContain("export async function GET");
    expect(content).toContain("export async function POST");
  });

  it("does NOT check orgType (bilateral)", () => {
    expect(content).not.toContain('orgType !== "provider"');
    expect(content).not.toContain('orgType === "provider"');
  });

  it("prevents self-invitation", () => {
    expect(content).toContain("Cannot invite your own organization");
  });

  it("inserts with status pending (not active)", () => {
    expect(content).toContain('status: "pending"');
    expect(content).not.toMatch(/status:\s*"active"/);
  });

  it("supports email-based invitation for unregistered orgs", () => {
    expect(content).toContain("invitationEmail");
    expect(content).toContain("invitationToken");
    expect(content).toContain("pending_registration");
  });

  it("handles UNIQUE constraint violation as DUPLICATE", () => {
    expect(content).toContain("23505");
    expect(content).toContain("DUPLICATE");
  });

  it("uses partners section permission (not vendors)", () => {
    expect(content).toContain('"partners"');
  });
});

describe("API: PATCH /api/events/collaborations/[accessId]", () => {
  const content = fs.readFileSync(
    path.join(ROOT, "src/app/api/events/collaborations/[accessId]/route.ts"),
    "utf-8"
  );

  it("supports accept, reject, and revoke actions", () => {
    expect(content).toContain('"accept"');
    expect(content).toContain('"reject"');
    expect(content).toContain('"revoke"');
  });

  it("checks hostOrgId for revoke authorization", () => {
    expect(content).toContain("collab.hostOrgId !== session.organizationId");
    expect(content).toContain("Only the host can revoke");
  });

  it("checks guestOrgId for accept/reject authorization", () => {
    expect(content).toContain("collab.guestOrgId !== session.organizationId");
  });

  it("maintains backward compat with legacy provider_event_access", () => {
    expect(content).toContain("providerEventAccess");
  });
});

describe("Tasks: cross-org guest task creation", () => {
  const content = fs.readFileSync(
    path.join(ROOT, "src/app/api/tasks/route.ts"),
    "utf-8"
  );

  it("checks event_collaborations for guest task creation", () => {
    expect(content).toContain("eventCollaborations");
    expect(content).toContain("No collaboration access to this event");
  });

  it("creates tasks with sharedWithHost: false by default", () => {
    expect(content).toContain("sharedWithHost: false");
  });

  it("host sees guest shared tasks (sharedWithHost = true)", () => {
    expect(content).toContain("sharedWithHost");
  });

  it("guest sees own tasks + assigned tasks via collaboratorOrgId", () => {
    expect(content).toContain("collaboratorOrgId");
  });

  it("auto-adds collaborator org as task participant for new tasks", () => {
    expect(content).toContain("activeCollabs");
    expect(content).toContain("collaboratorOrgId: c.guestOrgId");
  });
});

describe("getEvent: cross-org access via event_collaborations + legacy fallback", () => {
  const content = fs.readFileSync(path.join(ROOT, "src/lib/events.ts"), "utf-8");

  it("imports eventCollaborations", () => {
    expect(content).toContain("eventCollaborations");
  });

  it("imports providerEventAccess for legacy fallback", () => {
    expect(content).toContain("providerEventAccess");
  });

  it("checks event_collaborations when event not owned", () => {
    expect(content).toContain("eventCollaborations.guestOrgId");
    expect(content).toContain("eventCollaborations.status");
  });

  it("falls back to provider_event_access when event_collaborations has no row", () => {
    expect(content).toContain("providerEventAccess.providerOrgId");
    expect(content).toContain("providerEventAccess.status");
  });

  it("returns isCollaborator flag", () => {
    expect(content).toContain("isCollaborator");
  });
});

describe("UI: Partners naming in event context", () => {
  it("event sidebar uses Partners label (not Proveedores)", () => {
    const sidebar = fs.readFileSync(
      path.join(ROOT, "src/components/layout/event-sidebar.tsx"),
      "utf-8"
    );
    expect(sidebar).toContain('"Partners"');
    expect(sidebar).not.toContain('"Proveedores"');
  });

  it("event sidebar points to /partners route", () => {
    const sidebar = fs.readFileSync(
      path.join(ROOT, "src/components/layout/event-sidebar.tsx"),
      "utf-8"
    );
    expect(sidebar).toContain("/partners");
  });

  it("bottom-nav event items use Partners (not Proveedores)", () => {
    const bottomNav = fs.readFileSync(
      path.join(ROOT, "src/components/layout/bottom-nav.tsx"),
      "utf-8"
    );
    const eventMore = bottomNav.split("getEventMoreItems")[1]?.split("];")[0] || "";
    expect(eventMore).toContain('"Partners"');
    expect(eventMore).not.toContain('"Proveedores"');
  });

  it("event-section-guard labels vendors as Partners", () => {
    const guard = fs.readFileSync(
      path.join(ROOT, "src/components/events/event-section-guard.tsx"),
      "utf-8"
    );
    expect(guard).toContain('vendors: "Partners"');
    expect(guard).not.toContain('vendors: "Proveedores"');
  });

  it("event-permissions labels vendors as Partners", () => {
    const perms = fs.readFileSync(
      path.join(ROOT, "src/lib/event-permissions.ts"),
      "utf-8"
    );
    expect(perms).toContain('vendors: "Partners"');
  });
});

describe("Collaborator drawer: Partners tab and no role", () => {
  const content = fs.readFileSync(
    path.join(ROOT, "src/components/events/collaborator-drawer.tsx"),
    "utf-8"
  );

  it("tab label is Partners (not Proveedores)", () => {
    expect(content).toContain('label: "Partners"');
    expect(content).not.toContain('label: "Proveedores"');
  });

  it("does NOT have ROLE_OPTIONS or Rol en el evento", () => {
    expect(content).not.toContain("ROLE_OPTIONS");
    expect(content).not.toContain("Rol en el evento");
  });

  it("uses partners key in permission sections", () => {
    expect(content).toContain('key: "partners"');
  });

  it("calls /api/events/${eventId}/partners for invitations", () => {
    expect(content).toContain("/api/events/${eventId}/partners");
  });

  it("does NOT send role in API body", () => {
    const saveBlock = content.split("handleSave")[1]?.split("async function")[0] || "";
    expect(saveBlock).not.toContain("role,");
    expect(saveBlock).not.toContain("role:");
  });
});

describe("Permission key migration: vendors -> partners", () => {
  it("EventSectionPermissions type includes partners key", () => {
    const types = fs.readFileSync(path.join(ROOT, "src/types/index.ts"), "utf-8");
    expect(types).toContain('partners?: "view" | "none"');
  });

  it("SECTION_ORG_PERMISSION includes partners mapping", () => {
    const session = fs.readFileSync(path.join(ROOT, "src/lib/session.ts"), "utf-8");
    expect(session).toContain("partners:");
  });

  it("EVENT_PERMISSION_PRESETS use partners (not vendors)", () => {
    const types = fs.readFileSync(path.join(ROOT, "src/types/index.ts"), "utf-8");
    const presets = types.split("EVENT_PERMISSION_PRESETS")[1]?.split("};")[0] || "";
    expect(presets).toContain("partners");
    expect(presets).not.toContain("vendors");
  });

  it("cleanup migration migrates vendors key to partners in JSON", () => {
    const sql = fs.readFileSync(path.join(ROOT, "drizzle/0060_cleanup_cross_tenant.sql"), "utf-8");
    expect(sql).toContain("partners");
    expect(sql).toContain("vendors");
    expect(sql).toContain("jsonb_build_object");
  });
});

describe("Events page: dual-fetch + merge for collaborated events", () => {
  const content = fs.readFileSync(
    path.join(ROOT, "src/app/dashboard/events/page.tsx"),
    "utf-8"
  );

  it("fetches both owned and collaborated events", () => {
    expect(content).toContain('scope=collaborated');
    expect(content).toContain("Promise.all");
  });

  it("maps collaborated events to Event interface with _isCollaborated flag", () => {
    expect(content).toContain("_isCollaborated: true");
  });

  it("tracks collaboration status with _collabStatus", () => {
    expect(content).toContain("_collabStatus");
  });

  it("includes both active and pending collaborations", () => {
    expect(content).toContain('c.status === "active" || c.status === "pending"');
  });

  it("shows accept/reject buttons for pending collaborations", () => {
    expect(content).toContain("handleCollabAction");
    expect(content).toContain("Aceptar");
    expect(content).toContain("/api/events/collaborations/");
  });

  it("pending events are not navigable (no Link wrapper)", () => {
    expect(content).toContain('event._collabStatus === "pending" ?');
  });

  it("shows Colaborador badge for active collaborated events", () => {
    expect(content).toContain("Colaborador");
  });
});

describe("checkCollaborationSectionAccess: legacy fallback", () => {
  const content = fs.readFileSync(
    path.join(ROOT, "src/lib/event-permissions.ts"),
    "utf-8"
  );

  it("imports providerEventAccess for legacy fallback", () => {
    expect(content).toContain("providerEventAccess");
  });

  it("falls back to provider_event_access when event_collaborations has no row", () => {
    expect(content).toContain("providerEventAccess.providerOrgId");
    expect(content).toContain("providerEventAccess.status");
  });

  it("grants default view permissions for general/calendar/tasks in legacy fallback", () => {
    expect(content).toContain('"general" || section === "calendar" || section === "tasks"');
  });
});

describe("Vendors page: reads from partners endpoint", () => {
  const content = fs.readFileSync(
    path.join(ROOT, "src/app/dashboard/events/[id]/vendors/page.tsx"),
    "utf-8"
  );

  it("fetches platform partners from /api/events/${eventId}/partners", () => {
    expect(content).toContain("/api/events/${eventId}/partners");
  });

  it("uses guestOrgId (not providerOrgId) for already-invited check", () => {
    expect(content).toContain("pp.guestOrgId");
    expect(content).not.toContain("pp.providerOrgId");
  });

  it("uses guestName (not providerName) in UI", () => {
    expect(content).toContain("pp.guestName");
    expect(content).not.toContain("pp.providerName");
  });
});

describe("Partners notification includes link", () => {
  const content = fs.readFileSync(
    path.join(ROOT, "src/app/api/events/[eventId]/partners/route.ts"),
    "utf-8"
  );

  it("collaboration_invitation notification has a link field", () => {
    const notifBlock = content.split("collaboration_invitation")[1]?.split(".execute()")[0] || "";
    expect(notifBlock).toContain("link:");
    expect(notifBlock).toContain("/dashboard/events");
  });
});

describe("useTasks hook: orgType-agnostic", () => {
  const content = fs.readFileSync(path.join(ROOT, "src/hooks/use-tasks.ts"), "utf-8");

  it("does NOT check orgType for collaborated tasks", () => {
    expect(content).not.toContain('orgType === "provider"');
    expect(content).not.toContain("orgType");
  });

  it("always fetches collaborated tasks when no eventId", () => {
    expect(content).toContain("scope=collaborated");
    expect(content).toContain("!eventId");
  });
});

describe("Route migration: /vendors -> /partners", () => {
  it("next.config redirects /events/:id/vendors to /events/:id/partners", () => {
    const cfg = fs.readFileSync(path.join(ROOT, "next.config.ts"), "utf-8");
    expect(cfg).toContain("/dashboard/events/:id/vendors");
    expect(cfg).toContain("/dashboard/events/:id/partners");
  });

  it("partners page exists at the new route", () => {
    const exists = fs.existsSync(
      path.join(ROOT, "src/app/dashboard/events/[id]/partners/page.tsx")
    );
    expect(exists).toBe(true);
  });

  it("partners page uses /api/events/[eventId]/partners endpoint", () => {
    const page = fs.readFileSync(
      path.join(ROOT, "src/app/dashboard/events/[id]/partners/page.tsx"),
      "utf-8"
    );
    expect(page).toContain("/api/events/${eventId}/partners");
    expect(page).not.toContain("/api/events/${eventId}/providers");
  });
});
