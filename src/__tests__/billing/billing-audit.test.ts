import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "../..");

function readSrc(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), "utf-8");
}

// ============================================
// PLAN 1: Backend Billing Stripe Audit Fix
// ============================================

describe("P0: Critical billing fixes", () => {
  it("unified register sets organizations.planId", () => {
    const route = readSrc("app/api/auth/register/route.ts");
    expect(route).toContain("planId: plan.id");
  });

  it("system-init only has starter and provider-free plans", () => {
    const init = readSrc("lib/system-init.ts");
    expect(init).toContain('"starter"');
    expect(init).toContain('"provider-free"');
    expect(init).not.toContain('"pro"');
    expect(init).not.toContain('"business"');
  });

  it("OAuth/magic-link uses plan.trialDays, not hardcoded 7", () => {
    const profile = readSrc("app/api/user/profile/route.ts");
    expect(profile).toContain("trialDays");
    expect(profile).not.toMatch(/getDate\(\)\s*\+\s*7/);
  });

  it("requireActiveSubscription blocks past_due", () => {
    const session = readSrc("lib/session.ts");
    expect(session).toContain('"past_due"');
    expect(session).toContain('"canceled", "past_due"');
  });

  it("requireLimit applies default limits when plan is null", () => {
    const session = readSrc("lib/session.ts");
    expect(session).toContain("DEFAULT_LIMITS");
    expect(session).toContain("session.plan?.limits ?? DEFAULT_LIMITS");
  });
});

describe("P1: High priority fixes", () => {
  it("checkout URLs use orgType for provider routing", () => {
    const checkout = readSrc("app/api/subscriptions/checkout/route.ts");
    expect(checkout).toContain('org?.orgType === "provider" ? "vendor" : "dashboard"');
  });

  it("portal URLs use orgType for provider routing", () => {
    const portal = readSrc("app/api/subscriptions/portal/route.ts");
    expect(portal).toContain('org?.orgType === "provider" ? "vendor" : "dashboard"');
  });

  it("unified register uses validatePassword for all org types", () => {
    const route = readSrc("app/api/auth/register/route.ts");
    expect(route).toContain("validatePassword");
    expect(route).toContain("import { hashPassword, validatePassword }");
  });

  it("RSVP route enforces requireFeature('rsvp')", () => {
    const route = readSrc("app/api/events/[eventId]/rsvp/route.ts");
    expect(route).toContain('requireFeature("rsvp")');
  });

  it("guests route enforces requireFeature('guest_lists')", () => {
    const route = readSrc("app/api/events/[eventId]/guests/route.ts");
    expect(route).toContain('requireFeature("guest_lists")');
  });

  it("tasks template route enforces requireFeature('auto_processes')", () => {
    const route = readSrc("app/api/events/templates/[id]/tasks/route.ts");
    expect(route).toContain('requireFeature("auto_processes")');
  });

  it("unified register fails if plan not found in DB", () => {
    const route = readSrc("app/api/auth/register/route.ts");
    expect(route).toContain("plan not found in DB");
  });

  it("api-feature-flags documents dual system", () => {
    const flags = readSrc("lib/api/api-feature-flags.ts");
    expect(flags).toContain("INTENTIONALLY SEPARATE");
  });
});

describe("P2: Medium priority fixes", () => {
  it("webhook handler uses console.error, not console.log", () => {
    const webhook = readSrc("app/api/webhooks/stripe-platform/route.ts");
    expect(webhook).not.toContain("console.log");
  });

  it("admin tenants use plan.trialDays, not hardcoded 7", () => {
    const admin = readSrc("app/api/admin/tenants/route.ts");
    expect(admin).toContain("trialDays");
    expect(admin).not.toMatch(/getDate\(\)\s*\+\s*7[^0-9]/);
  });
});

// ============================================
// PLAN 2: Billing UI Tenant Impact
// ============================================

describe("UI: Trial copy consistency (14d)", () => {
  it("onboarding says 14 días, not 7", () => {
    const page = readSrc("app/onboarding/page.tsx");
    expect(page).toContain("14 días de prueba gratis");
    expect(page).not.toContain("7 días de prueba gratis");
  });

  it("welcome email says 14 días via trialDays param", () => {
    const email = readSrc("lib/email.ts");
    expect(email).toContain("sendWelcomeEmail");
    expect(email).toContain("trialDays: number = 14");
    expect(email).toContain("prueba gratuita de ${trialDays} días");
  });

  it("plans available email says 14 días", () => {
    const email = readSrc("lib/email.ts");
    expect(email).toContain("prueba gratuita de 14 días");
  });
});

describe("UI: Trial progress bar dynamic", () => {
  it("dashboard billing uses plan.trialDays for progress bar", () => {
    const settings = readSrc("app/dashboard/settings/page.tsx");
    expect(settings).toContain("billing?.plan?.trialDays ?? 14");
    expect(settings).not.toMatch(/\(\(14 - trialDays\) \/ 14\)/);
  });

  it("dashboard billing uses plan.trialDays for progress bar", () => {
    const settings = readSrc("app/dashboard/settings/page.tsx");
    expect(settings).toContain("trialDays");
  });
});

describe("UI: billing=upgrade deep link", () => {
  it("dashboard settings handles billing=upgrade", () => {
    const settings = readSrc("app/dashboard/settings/page.tsx");
    expect(settings).toContain('"upgrade"');
    expect(settings).toContain("setShowPlans(true)");
  });

  it("dashboard settings handles billing=upgrade", () => {
    const settings = readSrc("app/dashboard/settings/page.tsx");
    expect(settings).toContain('"upgrade"');
  });

  it("dashboard defaults to billing section when billing param present", () => {
    const settings = readSrc("app/dashboard/settings/page.tsx");
    expect(settings).toContain('if (params.get("billing")) return "billing"');
  });
});

describe("UI: billing=update-payment deep link", () => {
  it("dashboard settings handles billing=update-payment", () => {
    const settings = readSrc("app/dashboard/settings/page.tsx");
    expect(settings).toContain('"update-payment"');
  });

  it("dashboard settings handles billing=update-payment", () => {
    const settings = readSrc("app/dashboard/settings/page.tsx");
    expect(settings).toContain('"update-payment"');
  });
});

describe("Email: org-type aware URLs", () => {
  it("getSettingsUrl helper exists and routes providers to /vendor", () => {
    const email = readSrc("lib/email.ts");
    expect(email).toContain("function getSettingsUrl(orgType?: string)");
    expect(email).toContain('orgType === "provider" ? "vendor" : "dashboard"');
  });

  it("sendTrialExpiringEmail accepts orgType", () => {
    const email = readSrc("lib/email.ts");
    const match = email.match(/sendTrialExpiringEmail\([^)]+orgType/);
    expect(match).not.toBeNull();
  });

  it("sendTrialExpiredEmail accepts orgType", () => {
    const email = readSrc("lib/email.ts");
    const match = email.match(/sendTrialExpiredEmail\([^)]+orgType/);
    expect(match).not.toBeNull();
  });

  it("sendPaymentFailedEmail accepts orgType", () => {
    const email = readSrc("lib/email.ts");
    const match = email.match(/sendPaymentFailedEmail\([^)]+orgType/);
    expect(match).not.toBeNull();
  });

  it("sendSubscriptionCanceledEmail accepts orgType", () => {
    const email = readSrc("lib/email.ts");
    const match = email.match(/sendSubscriptionCanceledEmail\([^)]+orgType/);
    expect(match).not.toBeNull();
  });

  it("sendWinBackEmail accepts orgType", () => {
    const email = readSrc("lib/email.ts");
    const match = email.match(/sendWinBackEmail\([^)]+orgType/);
    expect(match).not.toBeNull();
  });

  it("sendTrialRenewedEmail accepts orgType", () => {
    const email = readSrc("lib/email.ts");
    const match = email.match(/sendTrialRenewedEmail\([^)]+orgType/);
    expect(match).not.toBeNull();
  });

  it("cron job passes orgType to lifecycle emails", () => {
    const cron = readSrc("app/api/cron/subscription-lifecycle/route.ts");
    expect(cron).toContain("org.orgType ?? undefined");
  });

  it("stripe webhook passes orgType to email functions", () => {
    const webhook = readSrc("app/api/webhooks/stripe-platform/route.ts");
    expect(webhook).toContain("org.orgType ?? undefined");
  });
});

describe("Email: sendPlansAvailableEmail dynamic for providers", () => {
  it("sendPlansAvailableEmail accepts orgType", () => {
    const email = readSrc("lib/email.ts");
    const match = email.match(/sendPlansAvailableEmail\([^)]+orgType/);
    expect(match).not.toBeNull();
  });

  it("shows provider-specific plan table (Free/Pro)", () => {
    const email = readSrc("lib/email.ts");
    expect(email).toContain("providerPlansTable");
    expect(email).toContain("isProvider ? providerPlansTable : tenantPlansTable");
  });
});

describe("UI: Usage/limits display", () => {
  it("dashboard billing state includes usage type", () => {
    const settings = readSrc("app/dashboard/settings/page.tsx");
    expect(settings).toContain("usage: {");
    expect(settings).toContain("users: number");
    expect(settings).toContain("events: number");
  });

  it("dashboard billing shows usage section", () => {
    const settings = readSrc("app/dashboard/settings/page.tsx");
    expect(settings).toContain("Uso actual");
    expect(settings).toContain("billing.usage.users");
    expect(settings).toContain("billing.usage.events");
  });

  it("dashboard billing shows usage section", () => {
    const settings = readSrc("app/dashboard/settings/page.tsx");
    expect(settings).toContain("Uso actual");
    expect(settings).toContain("usage");
  });
});

describe("handleBillingError utility", () => {
  it("billing-errors.ts exists with correct error codes", () => {
    const util = readSrc("lib/billing-errors.ts");
    expect(util).toContain("UpgradeRequired");
    expect(util).toContain("LimitReached");
    expect(util).toContain("SubscriptionInactive");
  });

  it("supports dashboard and vendor settings paths", () => {
    const util = readSrc("lib/billing-errors.ts");
    expect(util).toContain('"dashboard" | "vendor"');
  });

  it("create-event-drawer uses handleBillingError", () => {
    const drawer = readSrc("components/events/create-event-drawer.tsx");
    expect(drawer).toContain("handleBillingError");
  });

  it("team page uses handleBillingError", () => {
    const team = readSrc("app/dashboard/team/page.tsx");
    expect(team).toContain("handleBillingError");
  });
});

describe("UI: upgrade CTA in dashboard settings", () => {
  it("settings page supports plan management", () => {
    const settings = readSrc("app/dashboard/settings/page.tsx");
    expect(settings).toContain("/api/subscriptions/checkout");
  });

  it("settings page has plan upgrade flow", () => {
    const settings = readSrc("app/dashboard/settings/page.tsx");
    expect(settings).toContain("Gestionar");
  });
});

// ============================================
// CROSS-PLAN: Gap fixes
// ============================================

describe("Cross-plan gap fixes", () => {
  it("welcome email uses dynamic trialDays parameter", () => {
    const email = readSrc("lib/email.ts");
    expect(email).toContain("trialDays: number = 14");
    expect(email).toContain("prueba gratuita de ${trialDays} días");
  });

  it("register route passes trialDays to welcome email", () => {
    const route = readSrc("app/api/auth/register/route.ts");
    expect(route).toMatch(/sendWelcomeEmail[\s\S]*trialEndsAt,\s+trialDays/);
  });

  it("sendTrialRenewedEmail is org-type aware", () => {
    const email = readSrc("lib/email.ts");
    const fn = email.substring(
      email.indexOf("sendTrialRenewedEmail"),
      email.indexOf("sendPlansAvailableEmail")
    );
    expect(fn).toContain("orgType?: string");
    expect(fn).toContain("getSettingsUrl(orgType)");
  });

  it("no lifecycle email uses hardcoded /dashboard/settings URL", () => {
    const email = readSrc("lib/email.ts");
    const lifecycleSection = email.substring(
      email.indexOf("SUBSCRIPTION LIFECYCLE EMAILS")
    );
    expect(lifecycleSection).not.toContain(
      '`${getAppUrl()}/dashboard/settings?billing='
    );
  });
});
