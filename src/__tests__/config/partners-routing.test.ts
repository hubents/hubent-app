import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "../../..");

/**
 * Regression guardrails for Marketplace → Partners rename (route, sidebar, UI title).
 */
describe("Partners routing and config (post–Marketplace migration)", () => {
  it("next.config permanently redirects /dashboard/marketplace to /dashboard/partners", () => {
    const cfg = fs.readFileSync(path.join(ROOT, "next.config.ts"), "utf-8");
    expect(cfg).toContain('source: "/dashboard/marketplace"');
    expect(cfg).toContain('destination: "/dashboard/partners"');
    expect(cfg).toContain("permanent: true");
  });

  it("partners dashboard page defines Partners Hubents heading", () => {
    const page = fs.readFileSync(
      path.join(ROOT, "src/app/dashboard/partners/page.tsx"),
      "utf-8"
    );
    expect(page).toContain("Partners Hubents");
    expect(page).toContain("export default function PartnersPage");
  });

  it("tenant-types sidebar sections use partners not marketplace", () => {
    const tt = fs.readFileSync(path.join(ROOT, "src/config/tenant-types.ts"), "utf-8");
    expect(tt).toContain('"partners"');
    // Sidebar identifiers must not still reference old section key
    expect(tt).not.toMatch(/sidebarSections:\s*\[[^\]]*"marketplace"/);
  });

  it("main sidebar links to /dashboard/partners with Partners label", () => {
    const sidebar = fs.readFileSync(
      path.join(ROOT, "src/components/layout/main-sidebar.tsx"),
      "utf-8"
    );
    expect(sidebar).toContain('href: "/dashboard/partners"');
    expect(sidebar).toContain('name: "Partners"');
    expect(sidebar).toContain('hasSection("partners")');
  });
});
