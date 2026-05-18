import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "../../..");

// ============================================
// Provider Directory Integration Tests
// Validates sidebar, bottom-nav, and collaborator-drawer changes
// ============================================

describe("Sidebar: Unified main sidebar for all org types", () => {
  const content = fs.readFileSync(
    path.join(ROOT, "src/components/layout/main-sidebar.tsx"),
    "utf-8"
  );

  it("uses getSidebarSections to configure sections by orgType", () => {
    expect(content).toContain("getSidebarSections");
    expect(content).toContain("hasSection");
  });

  it("has navigation items pointing to /dashboard paths", () => {
    expect(content).toContain('href: "/dashboard"');
    expect(content).toContain('href: "/dashboard/events"');
  });

  it("supports partners section", () => {
    expect(content).toContain("partners");
    expect(content).toContain("/dashboard/partners");
  });

  it("filteredNavAfterProductivity is hidden when eventScoped", () => {
    expect(content).toContain("if (eventScoped) return [];");
  });

  it("renders collapsed tooltips for navigation items", () => {
    expect(content).toContain("TooltipContent");
    expect(content).toContain("isCollapsed");
  });
});

describe("Bottom-nav: Proveedores points to directory", () => {
  const content = fs.readFileSync(
    path.join(ROOT, "src/components/layout/bottom-nav.tsx"),
    "utf-8"
  );

  it("generalMoreItems Partners points to /dashboard/partners", () => {
    const generalMore = content.split("generalMoreItems")[1]?.split("];")[0] || "";
    expect(generalMore).toContain('"/dashboard/partners"');
  });

  it("does NOT point to contacts?segment=vendors for general nav", () => {
    const generalMore = content.split("generalMoreItems")[1]?.split("];")[0] || "";
    expect(generalMore).not.toContain("contacts?segment=vendors");
  });

  it("event-specific partners point to event partners page", () => {
    const eventMore = content.split("getEventMoreItems")[1]?.split("];")[0] || "";
    expect(eventMore).toContain("/partners");
  });
});

describe("Collaborator drawer: directory integration", () => {
  const content = fs.readFileSync(
    path.join(ROOT, "src/components/events/collaborator-drawer.tsx"),
    "utf-8"
  );

  it("VendorItem interface includes providerOrgId", () => {
    expect(content).toContain("providerOrgId: number | null");
  });

  it("DirectoryProvider interface is defined", () => {
    expect(content).toContain("interface DirectoryProvider");
    expect(content).toContain("providerCategory: string | null");
  });

  it("fetches from /api/providers for directory search", () => {
    expect(content).toContain('fetch(`/api/providers?');
  });

  it("shows verified badge for linked vendors", () => {
    expect(content).toContain("RiVerifiedBadgeFill");
    expect(content).toContain("v.providerOrgId");
  });

  it("invites partner via POST /api/events/[eventId]/partners", () => {
    expect(content).toContain("handleInvitePartner");
    expect(content).toContain("/api/events/${eventId}/partners");
    expect(content).toContain('method: "POST"');
  });

  it("handles DUPLICATE error code when partner already invited", () => {
    expect(content).toContain('"DUPLICATE"');
    expect(content).toContain("ya fue invitado");
  });

  it("resets directory state on drawer close", () => {
    expect(content).toContain('setDirectorySearch("")');
    expect(content).toContain("setDirectoryProviders([])");
  });

  it("filters out already-linked providers from directory results", () => {
    expect(content).toContain("linkedProviderOrgIds");
    expect(content).toContain("filteredDirectoryProviders");
  });

  it("has directory search state management", () => {
    expect(content).toContain("directorySearch");
    expect(content).toContain("setDirectorySearch");
  });
});

describe("Task participant-selector: no changes needed", () => {
  const content = fs.readFileSync(
    path.join(ROOT, "src/components/tasks/participant-selector.tsx"),
    "utf-8"
  );

  it("fetches from /api/providers for Partners directory search", () => {
    expect(content).toContain("/api/providers");
  });

  it("fetches from /api/contacts for contact search", () => {
    expect(content).toContain("/api/contacts");
  });
});

describe("Collaborator drawer: audit gap fixes", () => {
  const content = fs.readFileSync(
    path.join(ROOT, "src/components/events/collaborator-drawer.tsx"),
    "utf-8"
  );

  it("fetchData returns VendorItem[] for fresh data access", () => {
    expect(content).toContain("Promise<VendorItem[]>");
    expect(content).toContain("return freshVendors");
  });

  it("handleInvitePartner calls the partners API", () => {
    const inviteBlock = content.split("handleInvitePartner")[1]?.split("async function")[0] || "";
    expect(inviteBlock).toContain("/api/events/");
    expect(inviteBlock).toContain("partners");
  });

  it("uses per-item loading state (invitingProviderId) not global boolean", () => {
    expect(content).toContain("invitingProviderId");
    expect(content).toContain("invitingProviderId === p.id");
    expect(content).toContain("useState<number | null>(null)");
  });
});

describe("Cross-org flow integrity", () => {
  it("ensureVendorForProviderOrg creates vendor in planner org", () => {
    const content = fs.readFileSync(path.join(ROOT, "src/lib/cross-org.ts"), "utf-8");
    expect(content).toContain("organizationId: plannerOrgId");
    expect(content).toContain("providerOrgId: providerOrgId");
  });

  it("POST /api/events/[eventId]/providers returns vendorId in response", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "src/app/api/events/[eventId]/providers/route.ts"),
      "utf-8"
    );
    expect(content).toContain("vendorId: finalVendorId");
    expect(content).toContain(".returning()");
  });

  it("POST /api/events/[eventId]/collaborators validates vendorId belongs to org", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "src/app/api/events/[eventId]/collaborators/route.ts"),
      "utf-8"
    );
    expect(content).toContain("vendors.organizationId, session.organizationId");
  });
});
