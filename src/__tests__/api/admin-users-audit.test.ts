import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "../..");

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

describe("Admin Users — Route Structure", () => {
  const routes = [
    "app/api/admin/users/route.ts",
    "app/api/admin/users/[id]/route.ts",
    "app/api/admin/users/[id]/suspend/route.ts",
    "app/api/admin/users/[id]/reactivate/route.ts",
    "app/api/admin/users/[id]/promote/route.ts",
    "app/api/admin/users/[id]/demote/route.ts",
    "app/api/admin/users/[id]/reset-password/route.ts",
    "app/api/admin/users/[id]/resend-verification/route.ts",
  ];

  it("all required admin user routes exist", () => {
    for (const route of routes) {
      expect(fileExists(route)).toBe(true);
    }
  });

  it("all routes use requirePlatformAdmin()", () => {
    for (const route of routes) {
      const content = readFile(route);
      expect(content).toContain("requirePlatformAdmin");
    }
  });

  it("no route uses (user as any) casts", () => {
    for (const route of routes) {
      const content = readFile(route);
      expect(content).not.toContain("as any");
    }
  });

  it("no route accesses session.user.id (should be session.user.userId)", () => {
    for (const route of routes) {
      const content = readFile(route);
      const matches = content.match(/session\.user\.id\b/g);
      if (matches) {
        const filtered = matches.filter(
          (m) => !m.startsWith("session.user.userId")
        );
        expect(filtered).toHaveLength(0);
      }
    }
  });

  it("no route uses process.env at module level", () => {
    for (const route of routes) {
      const content = readFile(route);
      const lines = content.split("\n");
      for (const line of lines) {
        if (
          line.includes("process.env") &&
          !line.trim().startsWith("//") &&
          !line.trim().startsWith("*") &&
          !line.trim().startsWith("return")
        ) {
          const isInsideFunction =
            line.includes("function") || line.includes("return") || line.includes("=>");
          if (!isInsideFunction) {
            const lineIdx = lines.indexOf(line);
            let insideBlock = false;
            for (let i = lineIdx; i >= 0; i--) {
              if (
                lines[i].includes("function ") ||
                lines[i].includes("async function") ||
                lines[i].includes("export async function") ||
                lines[i].includes("=> {")
              ) {
                insideBlock = true;
                break;
              }
            }
            expect(insideBlock).toBe(true);
          }
        }
      }
    }
  });
});

describe("Admin Users — B1: Verification email fix", () => {
  it("resend-verification route uses sendVerificationEmail not sendPasswordResetEmail", () => {
    const content = readFile(
      "app/api/admin/users/[id]/resend-verification/route.ts"
    );
    expect(content).toContain("sendVerificationEmail");
    expect(content).not.toContain("sendPasswordResetEmail");
  });

  it("sendVerificationEmail function exists in email.ts", () => {
    const content = readFile("lib/email.ts");
    expect(content).toContain("export async function sendVerificationEmail");
  });

  it("verification email has correct subject line", () => {
    const content = readFile("lib/email.ts");
    expect(content).toContain("Verifica tu email - Hubents");
  });
});

describe("Admin Users — B2/B3: Server-side search & filtering", () => {
  const content = readFile("app/api/admin/users/route.ts");

  it("supports search parameter", () => {
    expect(content).toContain('searchParams.get("search")');
  });

  it("supports status filter parameter", () => {
    expect(content).toContain('searchParams.get("status")');
  });

  it("supports verified filter parameter", () => {
    expect(content).toContain('searchParams.get("verified")');
  });

  it("supports admin filter parameter", () => {
    expect(content).toContain('searchParams.get("admin")');
  });

  it("supports orgType filter parameter", () => {
    expect(content).toContain('searchParams.get("orgType")');
  });

  it("uses SQL ilike for search (case-insensitive)", () => {
    expect(content).toContain("ilike(users.name");
    expect(content).toContain("ilike(users.email");
  });

  it("returns meta with aggregate counts", () => {
    expect(content).toContain("buildMeta");
    expect(content).toContain("globalTotal");
    expect(content).toContain("adminCount");
    expect(content).toContain("verifiedCount");
    expect(content).toContain("suspendedCount");
    expect(content).toContain("noOrgCount");
  });

  it("buildMeta calculates noOrgCount efficiently (no redundant queries)", () => {
    expect(content).not.toContain("totalUsersForNoOrg");
    expect(content).toContain("usersWithOrgCount");
  });

  it("limits membership query to current page user IDs", () => {
    expect(content).toContain("inArray(organizationMembers.userId, userIds)");
  });
});

describe("Admin Users — Self-protection rules", () => {
  it("suspend route prevents self-suspension", () => {
    const content = readFile("app/api/admin/users/[id]/suspend/route.ts");
    expect(content).toContain("No puedes suspenderte a ti mismo");
  });

  it("demote route prevents self-demotion", () => {
    const content = readFile("app/api/admin/users/[id]/demote/route.ts");
    expect(content).toContain("No puedes revocarte tus propios permisos");
  });

  it("delete route prevents self-deletion", () => {
    const content = readFile("app/api/admin/users/[id]/route.ts");
    expect(content).toContain("No puedes eliminarte a ti mismo");
  });
});

describe("Admin Users — Super admin level checks", () => {
  const protectedRoutes = [
    "app/api/admin/users/[id]/suspend/route.ts",
    "app/api/admin/users/[id]/reactivate/route.ts",
    "app/api/admin/users/[id]/promote/route.ts",
    "app/api/admin/users/[id]/demote/route.ts",
    "app/api/admin/users/[id]/route.ts",
  ];

  it("all mutation routes require super_admin level", () => {
    for (const route of protectedRoutes) {
      const content = readFile(route);
      expect(content).toContain('platformLevel !== "super_admin"');
    }
  });
});

describe("Admin Users — User detail endpoint", () => {
  const content = readFile("app/api/admin/users/[id]/route.ts");

  it("GET returns organization details with orgType and orgStatus", () => {
    expect(content).toContain("orgType: organizations.orgType");
    expect(content).toContain("orgStatus: organizations.status");
  });

  it("GET returns suspension info fields", () => {
    expect(content).toContain("user.suspendedAt");
    expect(content).toContain("user.suspendedBy");
    expect(content).toContain("user.suspendedReason");
  });

  it("PATCH validates email uniqueness before update", () => {
    expect(content).toContain("El email ya está en uso");
  });
});

describe("Admin Tenants — Members API", () => {
  const content = readFile("app/api/admin/tenants/[id]/members/route.ts");

  it("members route file exists", () => {
    expect(
      fileExists("app/api/admin/tenants/[id]/members/route.ts")
    ).toBe(true);
  });

  it("GET returns members with user details", () => {
    expect(content).toContain("userName: users.name");
    expect(content).toContain("userEmail: users.email");
    expect(content).toContain("userImage: users.image");
  });

  it("GET returns available roles", () => {
    expect(content).toContain("availableRoles");
  });

  it("DELETE protects organization owner from removal", () => {
    expect(content).toContain(
      "No se puede remover al propietario de la organización"
    );
  });

  it("DELETE requires super_admin", () => {
    expect(content).toContain('platformLevel !== "super_admin"');
  });

  it("PATCH validates both membershipId and roleId", () => {
    expect(content).toContain("membershipId y roleId son requeridos");
  });

  it("PATCH validates role exists before updating", () => {
    expect(content).toContain("Rol no encontrado");
  });
});

describe("Admin Tenants — Events count", () => {
  const content = readFile("app/api/admin/tenants/[id]/route.ts");

  it("GET returns eventsCount", () => {
    expect(content).toContain("eventsCount");
    expect(content).toContain("eq(events.organizationId, tenantId)");
  });
});

describe("User Detail Drawer — Cross-navigation", () => {
  const content = readFile("components/admin/user-detail-drawer.tsx");

  it("organizations link to /admin/tenants/[id]", () => {
    expect(content).toContain("/admin/tenants/${org.id}");
  });

  it("shows org type badges", () => {
    expect(content).toContain("ORG_TYPE_CONFIG");
    expect(content).toContain("Planificador");
    expect(content).toContain("Proveedor");
  });

  it("shows org status when not active", () => {
    expect(content).toContain("ORG_STATUS_CONFIG");
    expect(content).toContain('org.orgStatus !== "active"');
  });
});

describe("Users Page — UI Completeness", () => {
  const content = readFile("app/admin/users/page.tsx");

  it("renders 5 stat cards", () => {
    expect(content).toContain("Total usuarios");
    expect(content).toContain("Admins");
    expect(content).toContain("Verificados");
    expect(content).toContain("Suspendidos");
    expect(content).toContain("Sin organización");
  });

  it("implements debounced search", () => {
    expect(content).toContain("debounceRef");
    expect(content).toContain("setDebouncedSearch");
  });

  it("has clear filters button", () => {
    expect(content).toContain("clearFilters");
    expect(content).toContain("Limpiar filtros");
  });

  it("organization links navigate to tenant detail", () => {
    expect(content).toContain("/admin/tenants/${org.id}");
  });

  it("shows org type pill (Proveedor/Planner)", () => {
    expect(content).toContain('"Proveedor"');
    expect(content).toContain('"Planner"');
  });

  it("no unused Building2 import", () => {
    expect(content).not.toMatch(/\bBuilding2\b/);
  });
});
