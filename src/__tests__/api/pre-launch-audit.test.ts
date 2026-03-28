import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "../..");
const ROOT = path.resolve(__dirname, "../../..");

function readSrc(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), "utf-8");
}

function readRoot(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf-8");
}

// ============================================
// FIX 1: Toaster mounted in root layout
// ============================================
describe("Fix 1: Toaster in root layout", () => {
  const layout = readSrc("app/layout.tsx");

  it("imports Toaster from sonner", () => {
    expect(layout).toContain('import { Toaster } from "@/components/ui/sonner"');
  });

  it("renders <Toaster /> component", () => {
    expect(layout).toContain("<Toaster");
  });
});

// ============================================
// FIX 2: Provider slug uses hyphens not underscores
// ============================================
describe("Fix 2: Provider slug normalization", () => {
  it("provider-register uses provider-free (hyphen)", () => {
    const route = readSrc("app/api/auth/provider-register/route.ts");
    expect(route).toContain('"provider-free"');
    expect(route).not.toContain('"provider_free"');
  });

  it("api-feature-flags uses provider-free and provider-pro (hyphens)", () => {
    const flags = readSrc("lib/api/api-feature-flags.ts");
    expect(flags).toContain('"provider-free"');
    expect(flags).toContain('"provider-pro"');
    expect(flags).not.toContain('"provider_free"');
    expect(flags).not.toContain('"provider_pro"');
  });

  it("seed-plans uses provider-free and provider-pro (hyphens)", () => {
    const seed = readRoot("scripts/seed-plans.ts");
    expect(seed).toContain('"provider-free"');
    expect(seed).toContain('"provider-pro"');
    expect(seed).not.toContain('"provider_free"');
    expect(seed).not.toContain('"provider_pro"');
  });
});

// ============================================
// FIX 3: Auto-login post tenant registration
// ============================================
describe("Fix 3: Auto-login after tenant registration", () => {
  const registerPage = readSrc("app/auth/register/page.tsx");

  it("calls signIn after successful registration", () => {
    expect(registerPage).toContain('signIn("credentials"');
  });

  it("redirects to onboarding on success", () => {
    expect(registerPage).toContain('router.push("/onboarding?welcome=true")');
  });

  it("falls back to login if auto-login fails", () => {
    expect(registerPage).toContain('router.push("/auth/login")');
  });
});

// ============================================
// FIX 4: Provider emailVerified + email lowercase
// ============================================
describe("Fix 4: Provider emailVerified + email lowercase", () => {
  const route = readSrc("app/api/auth/provider-register/route.ts");

  it("normalizes email to lowercase", () => {
    expect(route).toContain("parsed.data.email.toLowerCase()");
  });

  it("sets emailVerified on user creation", () => {
    expect(route).toContain("emailVerified: new Date()");
  });
});

// ============================================
// FIX 5: /terms and /privacy pages exist
// ============================================
describe("Fix 5: Legal pages exist", () => {
  it("/terms page exists", () => {
    const termsPath = path.join(SRC, "app/terms/page.tsx");
    expect(fs.existsSync(termsPath)).toBe(true);
  });

  it("/privacy page exists", () => {
    const privacyPath = path.join(SRC, "app/privacy/page.tsx");
    expect(fs.existsSync(privacyPath)).toBe(true);
  });

  it("terms page has metadata export", () => {
    const terms = readSrc("app/terms/page.tsx");
    expect(terms).toContain("metadata");
  });

  it("privacy page has metadata export", () => {
    const privacy = readSrc("app/privacy/page.tsx");
    expect(privacy).toContain("metadata");
  });

  it("terms and privacy are in PUBLIC_ROUTES", () => {
    const middleware = readSrc("middleware.ts");
    expect(middleware).toContain('"/terms"');
    expect(middleware).toContain('"/privacy"');
  });
});

// ============================================
// FIX 6: No fallback plan creation in register
// ============================================
describe("Fix 6: No fallback plan in register API", () => {
  const route = readSrc("app/api/auth/register/route.ts");

  it("does NOT create a starter plan inline", () => {
    // Should not contain inline plan creation with those specific features
    expect(route).not.toContain('"1 evento activo"');
    expect(route).not.toContain('"50 invitados RSVP"');
  });

  it("returns 500 if starter plan not found", () => {
    expect(route).toContain("El sistema no está configurado correctamente");
    expect(route).toContain("status: 500");
  });

  it("logs error when plan is missing", () => {
    expect(route).toContain("starter plan not found in DB");
  });
});

// ============================================
// FIX 7: Checkout/Portal URLs dynamic by orgType
// ============================================
describe("Fix 7: Dynamic URLs by orgType", () => {
  it("checkout success_url uses dynamic path based on orgType", () => {
    const checkout = readSrc("app/api/subscriptions/checkout/route.ts");
    expect(checkout).toContain('org?.orgType === "provider" ? "vendor" : "dashboard"');
  });

  it("portal return_url uses dynamic path based on orgType", () => {
    const portal = readSrc("app/api/subscriptions/portal/route.ts");
    expect(portal).toContain('org?.orgType === "provider" ? "vendor" : "dashboard"');
  });

  it("portal queries organization orgType", () => {
    const portal = readSrc("app/api/subscriptions/portal/route.ts");
    expect(portal).toContain("columns: { orgType: true }");
  });
});

// ============================================
// FIX 8: Trial days dynamic + UI text
// ============================================
describe("Fix 8: Trial days dynamic", () => {
  it("register API reads trialDays from plan instead of hardcoded 7", () => {
    const route = readSrc("app/api/auth/register/route.ts");
    expect(route).toContain("trialDays");
    expect(route).not.toMatch(/getDate\(\)\s*\+\s*7/);
  });

  it("auth layout shows 14 days not 7", () => {
    const layout = readSrc("app/auth/layout.tsx");
    expect(layout).toContain("14 días de prueba gratis");
    expect(layout).not.toContain("7 días de prueba gratis");
  });

  it("register page shows 14 days not 7", () => {
    const registerPage = readSrc("app/auth/register/page.tsx");
    expect(registerPage).toContain("14 días de prueba gratis");
    expect(registerPage).not.toContain("7 días de prueba gratis");
  });
});

// ============================================
// FIX 9: Dashboard hardcoded stats removed
// ============================================
describe("Fix 9: Dashboard cards cleanup", () => {
  const dashboard = readSrc("app/dashboard/page.tsx");

  it("does NOT show Pagos Pendientes card", () => {
    expect(dashboard).not.toContain('"Pagos Pendientes"');
  });

  it("does NOT show Leads Activos card", () => {
    expect(dashboard).not.toContain('"Leads Activos"');
  });

  it("still shows Eventos Activos card", () => {
    expect(dashboard).toContain('"Eventos Activos"');
  });

  it("still shows Tareas Pendientes card", () => {
    expect(dashboard).toContain('"Tareas Pendientes"');
  });
});

// ============================================
// FIX 10: Onboarding emails + error handling
// ============================================
describe("Fix 10: Onboarding emails + error handling", () => {
  const onboardingApi = readSrc("app/api/onboarding/complete/route.ts");
  const onboardingPage = readSrc("app/onboarding/page.tsx");

  it("imports sendOrganizationInviteEmail", () => {
    expect(onboardingApi).toContain("sendOrganizationInviteEmail");
  });

  it("calls sendOrganizationInviteEmail with all required params", () => {
    expect(onboardingApi).toContain("sendOrganizationInviteEmail(");
    expect(onboardingApi).toContain("org.name");
    expect(onboardingApi).toContain("role.name");
  });

  it("email send is fire-and-forget with catch", () => {
    expect(onboardingApi).toContain('.catch((err) => console.error("Failed to send invite email:"');
  });

  it("onboarding page shows toast on API error", () => {
    expect(onboardingPage).toContain("toast.error");
  });

  it("onboarding page checks res.ok", () => {
    expect(onboardingPage).toContain("!res.ok");
  });
});

// ============================================
// FIX 11: Redirect + console.logs + env
// ============================================
describe("Fix 11: Redirect, console.logs, env cleanup", () => {
  it("root page redirects directly to /auth/login", () => {
    const page = readSrc("app/page.tsx");
    expect(page).toContain('redirect("/auth/login")');
    expect(page).not.toContain('redirect("/login")');
  });

  it("middleware does NOT have excessive API logging", () => {
    const middleware = readSrc("middleware.ts");
    expect(middleware).not.toContain("[Middleware] API route:");
  });

  it("next.config does NOT expose R2 credentials in env block", () => {
    const config = fs.readFileSync(
      path.resolve(SRC, "../next.config.ts"),
      "utf-8"
    );
    expect(config).not.toContain("R2_ACCOUNT_ID");
    expect(config).not.toContain("R2_SECRET_ACCESS_KEY");
  });
});

// ============================================
// FIX 12: Provider upgrade path
// ============================================
describe("Fix 12: Provider BillingCard upgrade", () => {
  const vendorSettings = readSrc("app/vendor/settings/page.tsx");

  it("detects free plan by slug", () => {
    expect(vendorSettings).toContain('billingData.plan.slug === "provider-free"');
  });

  it("has upgrade CTA for free plan", () => {
    expect(vendorSettings).toContain("Desbloquea más con Pro");
  });

  it("calls checkout API on upgrade", () => {
    expect(vendorSettings).toContain("/api/subscriptions/checkout");
  });

  it("has portal button for paid plans", () => {
    expect(vendorSettings).toContain("Gestionar");
  });
});

// ============================================
// FIX 13: 404 and error pages
// ============================================
describe("Fix 13: Custom error pages", () => {
  it("not-found.tsx exists", () => {
    const notFoundPath = path.join(SRC, "app/not-found.tsx");
    expect(fs.existsSync(notFoundPath)).toBe(true);
  });

  it("error.tsx exists", () => {
    const errorPath = path.join(SRC, "app/error.tsx");
    expect(fs.existsSync(errorPath)).toBe(true);
  });

  it("not-found shows 404 code", () => {
    const notFound = readSrc("app/not-found.tsx");
    expect(notFound).toContain("404");
    expect(notFound).toContain("Página no encontrada");
  });

  it("error page has reset button", () => {
    const error = readSrc("app/error.tsx");
    expect(error).toContain("reset");
    expect(error).toContain("Intentar de nuevo");
  });

  it("error page is client component", () => {
    const error = readSrc("app/error.tsx");
    expect(error).toContain('"use client"');
  });

  it("error page shows digest ref", () => {
    const error = readSrc("app/error.tsx");
    expect(error).toContain("error.digest");
  });
});

// ============================================
// CROSS-CUTTING: Consistency checks
// ============================================
describe("Cross-cutting consistency", () => {
  it("no provider_free slug anywhere in src (except test files checking for absence)", () => {
    const flagsFile = readSrc("lib/api/api-feature-flags.ts");
    const seedFile = readRoot("scripts/seed-plans.ts");
    const providerRegister = readSrc("app/api/auth/provider-register/route.ts");

    // These files should NOT contain the old underscore format
    expect(flagsFile).not.toContain("provider_free");
    expect(flagsFile).not.toContain("provider_pro");
    expect(seedFile).not.toContain("provider_free");
    expect(seedFile).not.toContain("provider_pro");
    expect(providerRegister).not.toContain("provider_free");
  });

  it("both register routes normalize email to lowercase", () => {
    const tenantRegister = readSrc("app/api/auth/register/route.ts");
    const providerRegister = readSrc("app/api/auth/provider-register/route.ts");
    expect(tenantRegister).toContain("email.toLowerCase()");
    expect(providerRegister).toContain(".email.toLowerCase()");
  });

  it("both register routes set emailVerified", () => {
    const tenantRegister = readSrc("app/api/auth/register/route.ts");
    const providerRegister = readSrc("app/api/auth/provider-register/route.ts");
    expect(tenantRegister).toContain("emailVerified: new Date()");
    expect(providerRegister).toContain("emailVerified: new Date()");
  });
});
