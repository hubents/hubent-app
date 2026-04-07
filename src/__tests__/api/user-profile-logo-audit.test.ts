import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/** Repo src/ root (same pattern as billing-audit.test.ts) */
const SRC = path.resolve(__dirname, "../..");

function readSrc(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), "utf-8");
}

describe("Logo unificado + tenant activo en /api/user/profile", () => {
  const profile = readSrc("app/api/user/profile/route.ts");

  it("GET uses requireAuth after ensureUserHasOrganization", () => {
    expect(profile).toContain("await requireAuth()");
    expect(profile).toContain("ensureUserHasOrganization");
    expect(profile).toMatch(/tenantSession\.organizationId/);
  });

  it("GET loads organization by tenant session org id", () => {
    expect(profile).toContain("eq(organizations.id, tenantSession.organizationId)");
    expect(profile).not.toContain("eq(organizations.id, membership.organizationId)");
  });

  it("PATCH updates organization by tenantSession.organizationId", () => {
    expect(profile).toContain(".where(eq(organizations.id, tenantSession.organizationId))");
  });

  it("PATCH syncs logo and invoiceLogo when invoiceLogo is sent", () => {
    expect(profile).toContain("if (orgData.invoiceLogo !== undefined)");
    expect(profile).toContain("updateData.invoiceLogo = normalized");
    expect(profile).toContain("updateData.logo = normalized");
  });

  it("PATCH does not apply orgData.logo alone", () => {
    expect(profile).not.toMatch(/if \(orgData\.logo !== undefined\)/);
  });
});

describe("PATCH /api/organizations/profile sin logo", () => {
  const orgProfile = readSrc("app/api/organizations/profile/route.ts");

  it("updateSchema does not include logo field", () => {
    const schemaBlock = orgProfile.slice(
      orgProfile.indexOf("const updateSchema"),
      orgProfile.indexOf("function calculateProfileCompleteness"),
    );
    expect(schemaBlock).not.toMatch(/^\s*logo:\s*z\./m);
  });

  it("GET response includes invoiceLogo for preview", () => {
    expect(orgProfile).toContain("invoiceLogo: org.invoiceLogo");
  });
});

describe("Settings deep link section=fiscal", () => {
  const settings = readSrc("app/dashboard/settings/page.tsx");

  it("reads section=fiscal from URL", () => {
    expect(settings).toContain('params.get("section") === "fiscal"');
    expect(settings).toContain('searchParams.get("section") === "fiscal"');
  });
});

describe("Mi Perfil Público: logo solo lectura + CTA", () => {
  const page = readSrc("app/dashboard/public-profile/page.tsx");

  it("links to fiscal settings", () => {
    expect(page).toContain("/dashboard/settings?section=fiscal");
  });

  it("does not expose Logo URL text field for editing", () => {
    expect(page).not.toMatch(/Logo URL/);
    expect(page).not.toMatch(/updateField\("logo"/);
  });
});
