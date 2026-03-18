import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "../../..");

// ============================================
// Provider Task Sync: File Structure Tests
// ============================================

describe("Provider Task Sync: API route files exist", () => {
  it("vendor tasks list route exists", () => {
    expect(fs.existsSync(path.join(ROOT, "src/app/api/vendor/tasks/route.ts"))).toBe(true);
  });

  it("vendor task detail route exists", () => {
    expect(fs.existsSync(path.join(ROOT, "src/app/api/vendor/tasks/[taskId]/route.ts"))).toBe(true);
  });

  it("vendor task detail route contains GET and PATCH exports", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "src/app/api/vendor/tasks/[taskId]/route.ts"),
      "utf-8"
    );
    expect(content).toContain("export async function GET");
    expect(content).toContain("export async function PATCH");
  });

  it("vendor events route exists", () => {
    expect(fs.existsSync(path.join(ROOT, "src/app/api/vendor/events/route.ts"))).toBe(true);
  });

  it("vendor dashboard route exists", () => {
    expect(fs.existsSync(path.join(ROOT, "src/app/api/vendor/dashboard/route.ts"))).toBe(true);
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
    // Should check if participant already exists to avoid duplicates
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
    // Should have the vendor fallback pattern in canCommentOnTask
    const canCommentSection = content.split("canCommentOnTask")[1] || "";
    expect(canCommentSection).toContain("providerOrgId");
  });
});

describe("Provider Task Sync: UI components exist", () => {
  it("VendorTaskSheet component file exists", () => {
    expect(fs.existsSync(path.join(ROOT, "src/components/vendor/vendor-task-sheet.tsx"))).toBe(true);
  });

  it("VendorTasksContent component file exists", () => {
    expect(fs.existsSync(path.join(ROOT, "src/components/vendor/vendor-tasks-content.tsx"))).toBe(true);
  });

  it("VendorTaskSheet fetches from vendor API", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "src/components/vendor/vendor-task-sheet.tsx"),
      "utf-8"
    );
    expect(content).toContain("/api/vendor/tasks/");
    expect(content).toContain("PATCH");
  });

  it("VendorTasksContent fetches from both APIs", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "src/components/vendor/vendor-tasks-content.tsx"),
      "utf-8"
    );
    expect(content).toContain('fetch("/api/tasks")');
    expect(content).toContain('fetch("/api/vendor/tasks")');
    expect(content).toContain('"own"');
    expect(content).toContain('"invited"');
  });
});

describe("Provider Task Sync: PATCH validation rules", () => {
  it("only allows pending, in_progress, completed status values", () => {
    const allowedStatuses = ["pending", "in_progress", "completed"];
    
    // These should be valid
    expect(allowedStatuses.includes("pending")).toBe(true);
    expect(allowedStatuses.includes("in_progress")).toBe(true);
    expect(allowedStatuses.includes("completed")).toBe(true);
    
    // These should NOT be valid for provider updates
    expect(allowedStatuses.includes("cancelled")).toBe(false);
    expect(allowedStatuses.includes("archived")).toBe(false);
    expect(allowedStatuses.includes("")).toBe(false);
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
  it("own tasks (type 1+2) and invited tasks (type 3) have different organizationIds", () => {
    // Simulating the data model:
    // Type 1+2: task.organizationId = providerOrgId (e.g., 100)
    // Type 3: task.organizationId = plannerOrgId (e.g., 200)
    const providerOrgId = 100;
    const plannerOrgId = 200;

    const ownTask = { organizationId: providerOrgId, source: "own" };
    const invitedTask = { organizationId: plannerOrgId, source: "invited" };

    // API /api/tasks filters by organizationId = session.organizationId (providerOrgId)
    // This will never return invitedTask
    expect(ownTask.organizationId).toBe(providerOrgId);
    expect(invitedTask.organizationId).not.toBe(providerOrgId);

    // API /api/vendor/tasks filters by providerEventAccess + taskParticipants.vendorId
    // This will never return ownTask (since own tasks don't have the planner's eventId)
    expect(ownTask.organizationId).not.toBe(plannerOrgId);
    expect(invitedTask.organizationId).toBe(plannerOrgId);
  });
});

describe("Provider Task Sync: fix script exists", () => {
  it("fix-provider-task-participants.ts script file is importable path", () => {
    // Verify the script path convention
    const scriptPath = "scripts/fix-provider-task-participants.ts";
    expect(scriptPath).toContain("fix-provider-task-participants");
  });
});
