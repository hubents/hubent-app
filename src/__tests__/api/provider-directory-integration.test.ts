import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "../../..");

// ============================================
// Provider Directory Integration Tests
// Validates sidebar, bottom-nav, and collaborator-drawer changes
// ============================================

describe("Sidebar: Proveedores directory link rendered", () => {
  const content = fs.readFileSync(
    path.join(ROOT, "src/components/layout/main-sidebar.tsx"),
    "utf-8"
  );

  it("defines navigationAfterFinance with /dashboard/providers", () => {
    expect(content).toContain('href: "/dashboard/providers"');
    expect(content).toContain("navigationAfterFinance");
  });

  it("filteredNavAfter is computed from navigationAfterFinance", () => {
    expect(content).toContain("filteredNavAfter");
    expect(content).toContain("navigationAfterFinance.filter");
  });

  it("filteredNavAfter is rendered in JSX (not just defined)", () => {
    // The comment "Items after Finance" only exists in the JSX render section
    expect(content).toContain("Items after Finance");
    const renderBlock = content.split("Items after Finance")[1]?.split("Productividad")[0] || "";
    expect(renderBlock).toContain("filteredNavAfter.map");
  });

  it("filteredNavAfter is hidden when eventScoped", () => {
    expect(content).toContain("if (eventScoped) return [];");
  });

  it("renders collapsed tooltip for filteredNavAfter items", () => {
    // The JSX block for filteredNavAfter should have tooltip pattern
    const afterFinanceBlock = content.split("Items after Finance")[1]?.split("Productividad")[0] || "";
    expect(afterFinanceBlock).toContain("TooltipContent");
    expect(afterFinanceBlock).toContain("isCollapsed");
  });
});

describe("Bottom-nav: Proveedores points to directory", () => {
  const content = fs.readFileSync(
    path.join(ROOT, "src/components/layout/bottom-nav.tsx"),
    "utf-8"
  );

  it("generalMoreItems Proveedores points to /dashboard/providers", () => {
    // Find the Proveedores entry in generalMoreItems
    const generalMore = content.split("generalMoreItems")[1]?.split("];")[0] || "";
    expect(generalMore).toContain('"/dashboard/providers"');
  });

  it("does NOT point to contacts?segment=vendors for general nav", () => {
    const generalMore = content.split("generalMoreItems")[1]?.split("];")[0] || "";
    expect(generalMore).not.toContain("contacts?segment=vendors");
  });

  it("event-specific vendors still point to event vendors page", () => {
    const eventMore = content.split("getEventMoreItems")[1]?.split("];")[0] || "";
    expect(eventMore).toContain("/vendors");
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

  it("has directory search input in vendors tab", () => {
    expect(content).toContain("Directorio HubEnts");
    expect(content).toContain("Buscar en directorio");
  });

  it("shows verified badge for linked vendors", () => {
    expect(content).toContain("RiVerifiedBadgeFill");
    expect(content).toContain("v.providerOrgId");
  });

  it("has Mis Proveedores section header", () => {
    expect(content).toContain("Mis Proveedores");
  });

  it("invites provider via POST /api/events/[eventId]/providers", () => {
    expect(content).toContain("handleInviteProvider");
    expect(content).toContain("/api/events/${eventId}/providers");
    expect(content).toContain('method: "POST"');
  });

  it("handles DUPLICATE error code when provider already invited", () => {
    expect(content).toContain('"DUPLICATE"');
    expect(content).toContain("ya está asignado al evento");
  });

  it("resets directory state on drawer close", () => {
    expect(content).toContain('setDirectorySearch("")');
    expect(content).toContain("setDirectoryProviders([])");
  });

  it("filters out already-linked providers from directory results", () => {
    expect(content).toContain("linkedProviderOrgIds");
    expect(content).toContain("filteredDirectoryProviders");
  });

  it("requires minimum 2 characters for directory search", () => {
    expect(content).toContain("directorySearch.length < 2");
    expect(content).toContain("al menos 2 caracteres");
  });
});

describe("Task participant-selector: no changes needed", () => {
  const content = fs.readFileSync(
    path.join(ROOT, "src/components/tasks/participant-selector.tsx"),
    "utf-8"
  );

  it("fetches vendors from /api/vendors (local vendors include linked)", () => {
    expect(content).toContain("/api/vendors");
  });

  it("does NOT need to fetch from /api/providers", () => {
    // Task selector should NOT call providers API - vendors are created by invite flow
    expect(content).not.toContain("/api/providers");
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

  it("handleInviteProvider always refreshes vendors after success", () => {
    const inviteBlock = content.split("handleInviteProvider")[1]?.split("function clearSelection")[0] || "";
    expect(inviteBlock).toContain("freshVendors = await fetchData");
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
