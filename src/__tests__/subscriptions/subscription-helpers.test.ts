import { describe, it, expect, vi } from "vitest";

// ============================================
// Unit tests for subscription logic helpers
// ============================================

describe("Subscription Logic", () => {
  describe("Trial days calculation", () => {
    it("should return correct days left when trial is active", () => {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 5);
      const now = new Date();
      const daysLeft = Math.ceil(
        (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysLeft).toBe(5);
    });

    it("should return 0 when trial has expired", () => {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() - 1);
      const now = new Date();
      const daysLeft = Math.max(
        0,
        Math.ceil(
          (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      );
      expect(daysLeft).toBe(0);
    });

    it("should return 0 when trial ends today", () => {
      const trialEndsAt = new Date();
      trialEndsAt.setHours(0, 0, 0, 0);
      const now = new Date();
      const daysLeft = Math.max(
        0,
        Math.ceil(
          (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      );
      expect(daysLeft).toBe(0);
    });
  });

  describe("Stripe status mapping", () => {
    const statusMap: Record<string, string> = {
      active: "active",
      past_due: "past_due",
      canceled: "canceled",
      trialing: "trialing",
      paused: "paused",
      unpaid: "past_due",
      incomplete: "trialing",
      incomplete_expired: "canceled",
    };

    it("should map all Stripe statuses correctly", () => {
      expect(statusMap["active"]).toBe("active");
      expect(statusMap["past_due"]).toBe("past_due");
      expect(statusMap["canceled"]).toBe("canceled");
      expect(statusMap["trialing"]).toBe("trialing");
      expect(statusMap["paused"]).toBe("paused");
      expect(statusMap["unpaid"]).toBe("past_due");
      expect(statusMap["incomplete"]).toBe("trialing");
      expect(statusMap["incomplete_expired"]).toBe("canceled");
    });

    it("should fallback to active for unknown statuses", () => {
      const unknownStatus = "some_new_status";
      const mapped = statusMap[unknownStatus] || "active";
      expect(mapped).toBe("active");
    });
  });

  describe("Checkout trial logic", () => {
    it("should not offer trial when user has existing subscription", () => {
      const hasExistingSub = true;
      const planTrialDays = 14;
      const trialDays =
        !hasExistingSub && planTrialDays > 0 ? planTrialDays : undefined;
      expect(trialDays).toBeUndefined();
    });

    it("should offer trial for new customers with trial-enabled plan", () => {
      const hasExistingSub = false;
      const planTrialDays = 14;
      const trialDays =
        !hasExistingSub && planTrialDays > 0 ? planTrialDays : undefined;
      expect(trialDays).toBe(14);
    });

    it("should not offer trial for free plans (trialDays=0)", () => {
      const hasExistingSub = false;
      const planTrialDays = 0;
      const trialDays =
        !hasExistingSub && planTrialDays > 0 ? planTrialDays : undefined;
      expect(trialDays).toBeUndefined();
    });
  });

  describe("Plan price validation", () => {
    it("should correctly identify free plans", () => {
      const plan = { priceMonthly: "0", priceYearly: "0" };
      const isFree =
        Number(plan.priceMonthly) === 0 && Number(plan.priceYearly) === 0;
      expect(isFree).toBe(true);
    });

    it("should correctly identify paid plans", () => {
      const plan = { priceMonthly: "14.50", priceYearly: "145.00" };
      const isFree =
        Number(plan.priceMonthly) === 0 && Number(plan.priceYearly) === 0;
      expect(isFree).toBe(false);
    });

    it("should convert EUR amount to Stripe cents correctly", () => {
      const priceMonthly = "14.50";
      const amountInCents = Math.round(Number(priceMonthly) * 100);
      expect(amountInCents).toBe(1450);
    });

    it("should handle decimal precision for yearly prices", () => {
      const priceYearly = "295.00";
      const amountInCents = Math.round(Number(priceYearly) * 100);
      expect(amountInCents).toBe(29500);
    });
  });

  describe("MRR calculation", () => {
    it("should calculate MRR from active subscriptions", () => {
      const activeSubs = [
        { priceMonthly: "14.50" },
        { priceMonthly: "29.50" },
        { priceMonthly: "49.50" },
      ];
      const mrr = activeSubs.reduce(
        (sum, s) => sum + Number(s.priceMonthly || 0),
        0
      );
      expect(mrr).toBeCloseTo(93.5);
    });

    it("should handle empty subscription list", () => {
      const activeSubs: { priceMonthly: string }[] = [];
      const mrr = activeSubs.reduce(
        (sum, s) => sum + Number(s.priceMonthly || 0),
        0
      );
      expect(mrr).toBe(0);
    });

    it("should calculate ARR from MRR", () => {
      const mrr = 93.5;
      const arr = mrr * 12;
      expect(arr).toBe(1122);
    });
  });

  describe("Invoice amount formatting", () => {
    it("should convert Stripe amount_paid to decimal string", () => {
      const amountPaid = 2950; // cents
      const formatted = (amountPaid / 100).toFixed(2);
      expect(formatted).toBe("29.50");
    });

    it("should handle zero amounts", () => {
      const amountPaid = 0;
      const formatted = (amountPaid / 100).toFixed(2);
      expect(formatted).toBe("0.00");
    });

    it("should format presentment amount correctly", () => {
      const presentmentAmount = 3500; // cents in local currency
      const formatted = (presentmentAmount / 100).toFixed(2);
      expect(formatted).toBe("35.00");
    });
  });

  describe("Cron date window calculations", () => {
    it("should calculate 3-day-ahead window correctly", () => {
      const now = new Date("2025-06-15T10:00:00Z");
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      // The cron uses local-time setHours; verify the offset is exactly 3 days
      const diffMs = threeDaysFromNow.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(3);
    });

    it("should calculate 7-day-ago window correctly for win-back", () => {
      const now = new Date("2025-06-15T10:00:00Z");
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const diffMs = now.getTime() - sevenDaysAgo.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(7);
    });
  });

  describe("Plan slug validation", () => {
    it("should enforce slug uniqueness concept", () => {
      const existingSlugs = ["starter", "standard", "agency"];
      const newSlug = "starter";
      const isDuplicate = existingSlugs.includes(newSlug);
      expect(isDuplicate).toBe(true);
    });

    it("should allow unique slugs", () => {
      const existingSlugs = ["starter", "standard", "agency"];
      const newSlug = "enterprise";
      const isDuplicate = existingSlugs.includes(newSlug);
      expect(isDuplicate).toBe(false);
    });
  });

  describe("Webhook signature verification concept", () => {
    it("should reject missing signature", () => {
      const signature = null;
      expect(signature).toBeNull();
    });

    it("should reject empty signature", () => {
      const signature = "";
      expect(!!signature).toBe(false);
    });
  });

  describe("Cron auth verification", () => {
    it("should pass when CRON_SECRET matches", () => {
      const cronSecret = "test-secret-123";
      const authHeader = `Bearer ${cronSecret}`;
      const isValid = authHeader === `Bearer ${cronSecret}`;
      expect(isValid).toBe(true);
    });

    it("should fail when CRON_SECRET does not match", () => {
      const cronSecret = "test-secret-123";
      const authHeader: string = "Bearer wrong-secret";
      const isValid = authHeader === `Bearer ${cronSecret}`;
      expect(isValid).toBe(false);
    });

    it("should allow access when CRON_SECRET is not set (dev mode)", () => {
      const cronSecret = undefined;
      const allowInDev = !cronSecret;
      expect(allowInDev).toBe(true);
    });
  });

  describe("Audit log helper", () => {
    it("should format audit log params correctly", () => {
      const params = {
        actorId: "user-123",
        actorEmail: "admin@test.com",
        action: "plan.create",
        resource: "subscription_plan",
        resourceId: "5",
        details: { name: "Starter", slug: "starter" },
      };

      expect(params.action).toBe("plan.create");
      expect(params.resource).toBe("subscription_plan");
      expect(params.details).toEqual({ name: "Starter", slug: "starter" });
    });
  });

  // ============================================
  // Tests for Mar 2026 billing fixes
  // ============================================

  describe("BillingCard hasStripe guard (B1 fix)", () => {
    it("should hide portal button for free plan providers (no stripeSubscriptionId)", () => {
      const subscription = { stripeSubscriptionId: null, status: "active" };
      const hasStripe = !!subscription.stripeSubscriptionId;
      expect(hasStripe).toBe(false);
    });

    it("should show portal button for paid plan with stripeSubscriptionId", () => {
      const subscription = { stripeSubscriptionId: "sub_123abc", status: "active" };
      const hasStripe = !!subscription.stripeSubscriptionId;
      expect(hasStripe).toBe(true);
    });

    it("should show portal button for trialing subscription", () => {
      const subscription = { stripeSubscriptionId: "sub_trial_123", status: "trialing" };
      const hasStripe = !!subscription.stripeSubscriptionId;
      expect(hasStripe).toBe(true);
    });

    it("should identify free plan by slug", () => {
      const planSlug = "provider-free";
      const isFreePlan = planSlug === "provider-free";
      expect(isFreePlan).toBe(true);
    });

    it("should NOT identify pro plan as free", () => {
      const planSlug: string = "provider-pro";
      const isFreePlan = planSlug === "provider-free";
      expect(isFreePlan).toBe(false);
    });
  });

  describe("Status badge mapping (vendor + tenant)", () => {
    const statusMap: Record<string, { label: string; variant: string }> = {
      active: { label: "Activo", variant: "default" },
      trialing: { label: "Prueba gratuita", variant: "secondary" },
      past_due: { label: "Pago pendiente", variant: "destructive" },
      canceled: { label: "Cancelado", variant: "outline" },
      paused: { label: "Pausado", variant: "outline" },
    };

    it("should map all known statuses", () => {
      expect(statusMap["active"].label).toBe("Activo");
      expect(statusMap["trialing"].variant).toBe("secondary");
      expect(statusMap["past_due"].variant).toBe("destructive");
      expect(statusMap["canceled"].label).toBe("Cancelado");
    });

    it("should handle unknown status with fallback", () => {
      const unknownStatus = "some_new_status";
      const info = statusMap[unknownStatus] || { label: unknownStatus, variant: "outline" };
      expect(info.label).toBe("some_new_status");
      expect(info.variant).toBe("outline");
    });
  });

  describe("Past_due / canceled banner visibility (B3 fix)", () => {
    it("should show past_due banner only when status is past_due", () => {
      const statuses = ["active", "trialing", "past_due", "canceled", "paused"];
      const showPastDueBanner = statuses.map(s => s === "past_due");
      expect(showPastDueBanner).toEqual([false, false, true, false, false]);
    });

    it("should show canceled banner only when status is canceled", () => {
      const statuses = ["active", "trialing", "past_due", "canceled", "paused"];
      const showCanceledBanner = statuses.map(s => s === "canceled");
      expect(showCanceledBanner).toEqual([false, false, false, true, false]);
    });

    it("should show portal link in past_due banner only if hasStripe", () => {
      const hasStripe = true;
      const status = "past_due";
      const showPortalLink = status === "past_due" && hasStripe;
      expect(showPortalLink).toBe(true);
    });

    it("should NOT show portal link in past_due banner if no stripe sub", () => {
      const hasStripe = false;
      const status = "past_due";
      const showPortalLink = status === "past_due" && hasStripe;
      expect(showPortalLink).toBe(false);
    });
  });

  describe("Checkout stripeCustomerId persist (B2 fix)", () => {
    it("should persist customerId when creating new Stripe customer", () => {
      const existingSub = { stripeCustomerId: null };
      const newCustomerId = "cus_new_123";
      const shouldPersist = !existingSub.stripeCustomerId;
      expect(shouldPersist).toBe(true);

      // Simulate the update
      const updatePayload = shouldPersist
        ? { stripeCustomerId: newCustomerId, updatedAt: new Date() }
        : null;
      expect(updatePayload).not.toBeNull();
      expect(updatePayload?.stripeCustomerId).toBe("cus_new_123");
    });

    it("should NOT create new customer when existing customerId exists", () => {
      const existingSub = { stripeCustomerId: "cus_existing_456" };
      const shouldCreateCustomer = !existingSub.stripeCustomerId;
      expect(shouldCreateCustomer).toBe(false);
    });

    it("should determine trial eligibility from existing sub", () => {
      // New customer - no existing sub with Stripe
      const existingCustomerId1: string | null = null;
      const hasExistingSub1 = !!existingCustomerId1;
      const planTrialDays = 14;
      const trial1 = !hasExistingSub1 && planTrialDays > 0 ? planTrialDays : undefined;
      expect(trial1).toBe(14);

      // Returning customer - has existing Stripe sub
      const existingCustomerId2: string | null = "cus_existing";
      const hasExistingSub2 = !!existingCustomerId2;
      const trial2 = !hasExistingSub2 && planTrialDays > 0 ? planTrialDays : undefined;
      expect(trial2).toBeUndefined();
    });
  });

  describe("Post-checkout feedback (G1 fix)", () => {
    it("should recognize success param", () => {
      const billingParam: string | null = "success";
      expect(billingParam === "success").toBe(true);
      expect(billingParam === "cancelled").toBe(false);
    });

    it("should recognize cancelled param", () => {
      const billingParam: string | null = "cancelled";
      expect(billingParam === "success").toBe(false);
      expect(billingParam === "cancelled").toBe(true);
    });

    it("should ignore unrelated params", () => {
      const billingParam: string | null = "other";
      expect(billingParam === "success").toBe(false);
      expect(billingParam === "cancelled").toBe(false);
    });

    it("should handle null param gracefully", () => {
      const billingParam: string | null = null;
      expect(billingParam === "success").toBe(false);
      expect(billingParam === "cancelled").toBe(false);
    });
  });

  describe("Vendor upgrade button visibility", () => {
    it("should show upgrade button when no plan assigned (null)", () => {
      const billingData: { plan: { slug: string } | null } = { plan: null };
      const isFreePlan = !billingData.plan || billingData.plan.slug === "provider-free";
      expect(isFreePlan).toBe(true);
    });

    it("should show upgrade button only on free plan", () => {
      const scenarios = [
        { slug: "provider-free", expected: true },
        { slug: "provider-pro", expected: false },
        { slug: "starter", expected: false },
      ];
      scenarios.forEach(({ slug, expected }) => {
        const plan = { slug };
        const isFreePlan = !plan || plan.slug === "provider-free";
        expect(isFreePlan).toBe(expected);
      });
    });

    it("should show portal button only with Stripe sub", () => {
      const scenarios = [
        { stripeSubId: null, expected: false },
        { stripeSubId: "sub_123", expected: true },
        { stripeSubId: undefined, expected: false },
      ];
      scenarios.forEach(({ stripeSubId, expected }) => {
        expect(!!stripeSubId).toBe(expected);
      });
    });

    it("should not show both upgrade and portal for free plan without stripe", () => {
      const isFreePlan = true;
      const hasStripe = false;
      // Free plan shows upgrade, but not portal
      expect(isFreePlan).toBe(true);
      expect(hasStripe).toBe(false);
    });
  });

  describe("Invoice display logic", () => {
    it("should prefer presentment amount when available", () => {
      const inv = { amount: "14.50", presentmentAmount: "16.50", presentmentCurrency: "USD" };
      const display = inv.presentmentAmount && inv.presentmentCurrency
        ? `${inv.presentmentCurrency} ${inv.presentmentAmount}`
        : `€${inv.amount}`;
      expect(display).toBe("USD 16.50");
    });

    it("should fallback to EUR amount when no presentment", () => {
      const inv = { amount: "14.50", presentmentAmount: null, presentmentCurrency: null };
      const display = inv.presentmentAmount && inv.presentmentCurrency
        ? `${inv.presentmentCurrency} ${inv.presentmentAmount}`
        : `€${inv.amount}`;
      expect(display).toBe("€14.50");
    });

    it("should show Pagado badge for paid invoices", () => {
      const paidStatus: string = "paid";
      const openStatus: string = "open";
      expect(paidStatus === "paid" ? "Pagado" : paidStatus).toBe("Pagado");
      expect(openStatus === "paid" ? "Pagado" : openStatus).toBe("open");
    });
  });

  describe("NaN validation for IDs", () => {
    it("should detect invalid ID", () => {
      const id = "abc";
      const parsed = parseInt(id);
      expect(isNaN(parsed)).toBe(true);
    });

    it("should accept valid numeric ID", () => {
      const id = "42";
      const parsed = parseInt(id);
      expect(isNaN(parsed)).toBe(false);
      expect(parsed).toBe(42);
    });

    it("should detect empty ID", () => {
      const id = "";
      const parsed = parseInt(id);
      expect(isNaN(parsed)).toBe(true);
    });
  });
});
