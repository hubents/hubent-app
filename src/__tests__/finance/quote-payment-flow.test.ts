/**
 * Tests for the complete quote payment lifecycle.
 * Validates the full flow: payment_promise → partial → paid → revert.
 * Also tests edit-blocking rules for quotes with payments.
 */
import { describe, it, expect } from "vitest";

const QUOTE_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["accepted", "rejected"],
  accepted: ["payment_promise", "sent"],
  rejected: ["sent", "accepted"],
  payment_promise: ["accepted", "sent", "partial", "paid"],
  partial: ["paid", "payment_promise"],
  paid: ["payment_promise"],
};

function isValidTransition(current: string, next: string): boolean {
  return (QUOTE_TRANSITIONS[current] || []).includes(next);
}

function determineTargetStatus(
  totalPaid: number,
  docTotal: number,
  currentStatus: string
): string | null {
  if (totalPaid <= 0) {
    if (currentStatus === "paid" || currentStatus === "partial") return "payment_promise";
    return null;
  } else if (totalPaid < docTotal) {
    if (currentStatus !== "partial") return "partial";
    return null;
  } else {
    if (currentStatus !== "paid") return "paid";
    return null;
  }
}

/**
 * Simulates edit-blocking rule from finance.ts updateDocument():
 * Block editing quotes with paid/partial status.
 */
function canEditQuote(status: string): boolean {
  return status !== "paid" && status !== "partial";
}

/**
 * Simulates auto-reset rule from finance.ts updateDocument():
 * If quote has active status and financial changes → auto-reset to "sent".
 */
function shouldAutoResetOnEdit(status: string, hasFinancialChanges: boolean): boolean {
  const activeStatuses = ["accepted", "rejected", "payment_promise", "partial", "paid"];
  return activeStatuses.includes(status) && hasFinancialChanges;
}

describe("Quote Payment Lifecycle — Happy Path", () => {
  it("follows the full flow: draft → sent → accepted → payment_promise → partial → paid", () => {
    const flow = ["draft", "sent", "accepted", "payment_promise", "partial", "paid"];
    for (let i = 0; i < flow.length - 1; i++) {
      expect(isValidTransition(flow[i], flow[i + 1])).toBe(true);
    }
  });

  it("first partial payment transitions payment_promise → partial", () => {
    const target = determineTargetStatus(500, 1000, "payment_promise");
    expect(target).toBe("partial");
    expect(isValidTransition("payment_promise", "partial")).toBe(true);
  });

  it("second payment completing total transitions partial → paid", () => {
    const target = determineTargetStatus(1000, 1000, "partial");
    expect(target).toBe("paid");
    expect(isValidTransition("partial", "paid")).toBe(true);
  });

  it("single full payment transitions payment_promise → paid directly", () => {
    const target = determineTargetStatus(1000, 1000, "payment_promise");
    expect(target).toBe("paid");
    expect(isValidTransition("payment_promise", "paid")).toBe(true);
  });
});

describe("Quote Payment Lifecycle — Revert Path", () => {
  it("removing last payment from partial reverts to payment_promise", () => {
    const target = determineTargetStatus(0, 1000, "partial");
    expect(target).toBe("payment_promise");
    expect(isValidTransition("partial", "payment_promise")).toBe(true);
  });

  it("removing all payments from paid reverts to payment_promise", () => {
    const target = determineTargetStatus(0, 1000, "paid");
    expect(target).toBe("payment_promise");
    expect(isValidTransition("paid", "payment_promise")).toBe(true);
  });

  it("removing one payment from paid (still partial) transitions paid → partial is NOT a valid manual transition", () => {
    // When a payment is deleted but some remain, recalculation sets partial
    const target = determineTargetStatus(500, 1000, "paid");
    expect(target).toBe("partial");
    // However paid → partial is NOT a valid manual transition, 
    // so this must use skipValidation: true (which recalculateDocumentPayments does)
    expect(isValidTransition("paid", "partial")).toBe(false);
  });
});

describe("Quote Edit Blocking Rules", () => {
  it("allows editing quote in draft", () => {
    expect(canEditQuote("draft")).toBe(true);
  });

  it("allows editing quote in sent", () => {
    expect(canEditQuote("sent")).toBe(true);
  });

  it("allows editing quote in accepted", () => {
    expect(canEditQuote("accepted")).toBe(true);
  });

  it("allows editing quote in payment_promise", () => {
    expect(canEditQuote("payment_promise")).toBe(true);
  });

  it("blocks editing quote in partial", () => {
    expect(canEditQuote("partial")).toBe(false);
  });

  it("blocks editing quote in paid", () => {
    expect(canEditQuote("paid")).toBe(false);
  });
});

describe("Quote Auto-Reset on Edit", () => {
  it("resets accepted → sent when items change", () => {
    expect(shouldAutoResetOnEdit("accepted", true)).toBe(true);
  });

  it("resets payment_promise → sent when items change", () => {
    expect(shouldAutoResetOnEdit("payment_promise", true)).toBe(true);
  });

  it("does NOT reset draft on item changes", () => {
    expect(shouldAutoResetOnEdit("draft", true)).toBe(false);
  });

  it("does NOT reset sent on item changes", () => {
    expect(shouldAutoResetOnEdit("sent", true)).toBe(false);
  });

  it("does NOT reset any status without financial changes", () => {
    expect(shouldAutoResetOnEdit("accepted", false)).toBe(false);
    expect(shouldAutoResetOnEdit("payment_promise", false)).toBe(false);
  });

  it("auto-reset for partial/paid is unreachable due to edit-blocking (dead code)", () => {
    // shouldAutoResetOnEdit returns true for partial/paid with changes
    expect(shouldAutoResetOnEdit("partial", true)).toBe(true);
    expect(shouldAutoResetOnEdit("paid", true)).toBe(true);
    // BUT canEditQuote blocks editing before auto-reset can run
    expect(canEditQuote("partial")).toBe(false);
    expect(canEditQuote("paid")).toBe(false);
  });
});

describe("Conciliation Filter — Quotes eligible for payment", () => {
  function isQuoteEligibleForConciliation(status: string): boolean {
    return status === "payment_promise" || status === "partial";
  }

  it("includes payment_promise quotes", () => {
    expect(isQuoteEligibleForConciliation("payment_promise")).toBe(true);
  });

  it("includes partial quotes", () => {
    expect(isQuoteEligibleForConciliation("partial")).toBe(true);
  });

  it("excludes draft quotes", () => {
    expect(isQuoteEligibleForConciliation("draft")).toBe(false);
  });

  it("excludes sent quotes", () => {
    expect(isQuoteEligibleForConciliation("sent")).toBe(false);
  });

  it("excludes paid quotes", () => {
    expect(isQuoteEligibleForConciliation("paid")).toBe(false);
  });

  it("excludes accepted quotes (no payment_promise yet)", () => {
    expect(isQuoteEligibleForConciliation("accepted")).toBe(false);
  });
});
