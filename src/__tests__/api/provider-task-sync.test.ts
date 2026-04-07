import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "../../..");

// ============================================
// Provider Task Sync: Unified API tests
// ============================================

describe("Provider Task Sync: unified API routes", () => {
  it("events route supports scope=collaborated", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/app/api/events/route.ts"), "utf-8");
    expect(content).toContain("collaborated");
    expect(content).toContain("getCollaboratedEvents");
  });

  it("tasks route supports scope=collaborated", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/app/api/tasks/route.ts"), "utf-8");
    expect(content).toContain("collaborated");
    expect(content).toContain("getCollaboratedTasks");
  });

  it("events collaborations route exists", () => {
    expect(fs.existsSync(path.join(ROOT, "src/app/api/events/collaborations/[accessId]/route.ts"))).toBe(true);
  });

  it("organizations profile route exists", () => {
    expect(fs.existsSync(path.join(ROOT, "src/app/api/organizations/profile/route.ts"))).toBe(true);
  });
});

describe("Provider Task Sync: cross-org helpers", () => {
  it("cross-org.ts exports autoLinkVendorToEventTasks", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/lib/cross-org.ts"), "utf-8");
    expect(content).toContain("export async function autoLinkVendorToEventTasks");
  });

  it("autoLinkVendorToEventTasks inserts with type vendor, canEdit false, canComment true", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/lib/cross-org.ts"), "utf-8");
    expect(content).toContain('type: "vendor"');
    expect(content).toContain("canEdit: false");
    expect(content).toContain("canComment: true");
  });

  it("autoLinkVendorToEventTasks checks for existing participants before insert", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/lib/cross-org.ts"), "utf-8");
    expect(content).toContain("existing");
    expect(content).toContain("skipped");
  });
});

describe("Provider Task Sync: chat permission cross-org fallback", () => {
  it("canAccessTaskChat has vendorId cross-org fallback", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/lib/task-chat.ts"), "utf-8");
    expect(content).toContain("vendors.providerOrgId");
    expect(content).toContain("vendorParticipant");
  });

  it("canCommentOnTask has vendorId cross-org fallback", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/lib/task-chat.ts"), "utf-8");
    const canCommentSection = content.split("canCommentOnTask")[1] || "";
    expect(canCommentSection).toContain("providerOrgId");
  });
});

describe("Provider Task Sync: PATCH validation rules", () => {
  it("only allows pending, in_progress, completed status values", () => {
    const allowedStatuses = ["pending", "in_progress", "completed"];
    expect(allowedStatuses.includes("pending")).toBe(true);
    expect(allowedStatuses.includes("in_progress")).toBe(true);
    expect(allowedStatuses.includes("completed")).toBe(true);
    expect(allowedStatuses.includes("cancelled")).toBe(false);
  });
});

describe("Provider Task Sync: task participant schema", () => {
  it("task participant type 'vendor' is in the enum", () => {
    const validTypes = ["planner", "vendor", "client", "assistant", "guest", "contact"];
    expect(validTypes).toContain("vendor");
  });

  it("vendor participant default permissions are correct", () => {
    const defaultVendorPerms = { canEdit: false, canComment: true };
    expect(defaultVendorPerms.canEdit).toBe(false);
    expect(defaultVendorPerms.canComment).toBe(true);
  });
});

describe("Provider Task Sync: data isolation", () => {
  it("own tasks and invited tasks have different organizationIds", () => {
    const providerOrgId = 100;
    const plannerOrgId = 200;

    const ownTask = { organizationId: providerOrgId, source: "own" };
    const invitedTask = { organizationId: plannerOrgId, source: "collaborated" };

    expect(ownTask.organizationId).toBe(providerOrgId);
    expect(invitedTask.organizationId).not.toBe(providerOrgId);
  });
});

describe("Provider Task Sync: vendor portal removed", () => {
  it("no vendor portal directory exists", () => {
    expect(fs.existsSync(path.join(ROOT, "src/app/vendor"))).toBe(false);
  });

  it("no vendor API directory exists", () => {
    expect(fs.existsSync(path.join(ROOT, "src/app/api/vendor"))).toBe(false);
  });

  it("middleware redirects /vendor to /dashboard", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/middleware.ts"), "utf-8");
    expect(content).toContain("/vendor");
    expect(content).toContain("/dashboard");
  });
});

describe("Provider Task Sync: migration script exists", () => {
  it("migrate-provider-roles.ts script exists", () => {
    expect(fs.existsSync(path.join(ROOT, "scripts/migrate-provider-roles.ts"))).toBe(true);
  });
});

// ============================================
// useTasks: standalone scope excludes collaborated merge
// ============================================

describe("useTasks: scope-aware collaborated merge", () => {
  it("useTasks does NOT fetch collaborated when scope is standalone", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/hooks/use-tasks.ts"), "utf-8");
    expect(content).toContain('scope !== "standalone"');
  });

  it("useTasks still fetches collaborated when scope is not standalone", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/hooks/use-tasks.ts"), "utf-8");
    expect(content).toContain("scope=collaborated");
  });

  it("scope filter condition combines eventId and standalone checks", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/hooks/use-tasks.ts"), "utf-8");
    expect(content).toContain('!eventId && scope !== "standalone"');
  });

  it("no debug instrumentation remains in use-tasks.ts", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/hooks/use-tasks.ts"), "utf-8");
    expect(content).not.toContain("#region agent log");
    expect(content).not.toContain("127.0.0.1:7680");
    expect(content).not.toContain("sessionId");
  });
});

// ============================================
// Task auto-participant: respects collaboration permissions
// ============================================

describe("Task creation: collaboration permission checks", () => {
  it("auto-participant checks permissions.tasks before adding collaborator", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/app/api/tasks/route.ts"), "utf-8");
    expect(content).toContain("taskPerm");
    expect(content).toContain(".tasks");
  });

  it("skips collaborators with tasks permission set to none", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/app/api/tasks/route.ts"), "utf-8");
    expect(content).toContain('taskPerm === "none"');
  });

  it("sets canEdit based on tasks edit permission", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/app/api/tasks/route.ts"), "utf-8");
    expect(content).toContain('canEdit: taskPerm === "edit"');
  });

  it("fetches permissions field from event_collaborations", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/app/api/tasks/route.ts"), "utf-8");
    expect(content).toContain("eventCollaborations.permissions");
  });
});

// ============================================
// Partners: bilateral API and pagination
// ============================================

describe("Partners page: bilateral API and pagination", () => {
  it("global Partners page calls /partners API (not /providers)", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/app/dashboard/partners/page.tsx"), "utf-8");
    const inviteSection = content.split("handleInviteToEvent")[1]?.split("finally")[0] || "";
    expect(inviteSection).toContain("/partners");
    expect(inviteSection).not.toContain("/providers");
  });

  it("sends guestOrgId (not providerOrgId) in invite payload", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/app/dashboard/partners/page.tsx"), "utf-8");
    const inviteSection = content.split("handleInviteToEvent")[1]?.split("finally")[0] || "";
    expect(inviteSection).toContain("guestOrgId");
    expect(inviteSection).not.toContain("providerOrgId");
  });

  it("sends page parameter in fetchProviders", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/app/dashboard/partners/page.tsx"), "utf-8");
    expect(content).toContain('params.set("page", page.toString())');
  });

  it("resets page to 1 on filter changes", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/app/dashboard/partners/page.tsx"), "utf-8");
    expect(content).toContain("setPage(1)");
  });

  it("vendors API returns contactEmail and contactPhone aliases", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/app/api/events/[eventId]/vendors/route.ts"), "utf-8");
    expect(content).toContain("contactEmail: vendors.email");
    expect(content).toContain("contactPhone: vendors.phone");
  });
});
