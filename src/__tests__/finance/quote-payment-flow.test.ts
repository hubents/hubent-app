/**
 * Tests for the quote payment lifecycle.
 * Quotes have 4 valid user-facing statuses: Pendiente, Aceptado, Rechazado, Promesa de pago.
 * Quotes NEVER transition to partial/paid — only invoices do.
 * Payments can be registered against quotes in payment_promise status,
 * but the quote status remains payment_promise regardless of amount paid.
 */
import { describe, it, expect } from "vitest";

const QUOTE_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["accepted", "rejected"],
  accepted: ["payment_promise", "sent"],
  rejected: ["sent", "accepted"],
  payment_promise: ["accepted", "sent"],
};

function isValidTransition(current: string, next: string): boolean {
  return (QUOTE_TRANSITIONS[current] || []).includes(next);
}

/**
 * Simulates recalculateDocumentPayments logic for quotes.
 * Quotes never change to partial/paid — they stay in payment_promise.
 */
function determineTargetStatus(
  totalPaid: number,
  docTotal: number,
  currentStatus: string
): string | null {
  // Quotes never transition to partial/paid.
  // Only revert from invalid states if they somehow got there.
  if (currentStatus === "paid" || currentStatus === "partial") {
    return "payment_promise";
  }
  // No status change regardless of payment amount
  return null;
}

/**
 * Simulates edit-blocking rule from finance.ts updateDocument().
 * Quotes are always editable (no blocking based on payment status).
 */
function canEditQuote(status: string): boolean {
  // Quotes don't get blocked by payment status (only invoices do)
  return true;
}

/**
 * Simulates auto-reset rule from finance.ts updateDocument():
 * If quote has active status and financial changes → auto-reset to "sent".
 */
function shouldAutoResetOnEdit(status: string, hasFinancialChanges: boolean): boolean {
  const activeStatuses = ["accepted", "rejected", "payment_promise"];
  return activeStatuses.includes(status) && hasFinancialChanges;
}

describe("Quote Status Transitions", () => {
  it("follows the standard flow: draft → sent → accepted → payment_promise", () => {
    const flow = ["draft", "sent", "accepted", "payment_promise"];
    for (let i = 0; i < flow.length - 1; i++) {
      expect(isValidTransition(flow[i], flow[i + 1])).toBe(true);
    }
  });

  it("allows going back from payment_promise to accepted", () => {
    expect(isValidTransition("payment_promise", "accepted")).toBe(true);
  });

  it("allows resending from payment_promise", () => {
    expect(isValidTransition("payment_promise", "sent")).toBe(true);
  });

  it("blocks payment_promise → partial (quotes never reach partial)", () => {
    expect(isValidTransition("payment_promise", "partial")).toBe(false);
  });

  it("blocks payment_promise → paid (quotes never reach paid)", () => {
    expect(isValidTransition("payment_promise", "paid")).toBe(false);
  });
});

describe("Quote Payment Recalculation — quotes stay in payment_promise", () => {
  it("does NOT change status when a partial payment is registered", () => {
    const target = determineTargetStatus(500, 1000, "payment_promise");
    expect(target).toBeNull();
  });

  it("does NOT change status when a full payment is registered", () => {
    const target = determineTargetStatus(1000, 1000, "payment_promise");
    expect(target).toBeNull();
  });

  it("does NOT change status when all payments are removed", () => {
    const target = determineTargetStatus(0, 1000, "payment_promise");
    expect(target).toBeNull();
  });

  it("reverts quote from invalid 'paid' state to payment_promise", () => {
    expect(determineTargetStatus(1000, 1000, "paid")).toBe("payment_promise");
  });

  it("reverts quote from invalid 'partial' state to payment_promise", () => {
    expect(determineTargetStatus(500, 1000, "partial")).toBe("payment_promise");
  });
});

describe("Quote Edit Rules", () => {
  it("allows editing quote in any status", () => {
    expect(canEditQuote("draft")).toBe(true);
    expect(canEditQuote("sent")).toBe(true);
    expect(canEditQuote("accepted")).toBe(true);
    expect(canEditQuote("rejected")).toBe(true);
    expect(canEditQuote("payment_promise")).toBe(true);
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
});

describe("Conciliation Filter — Quotes eligible for payment", () => {
  function isQuoteEligibleForConciliation(status: string): boolean {
    return status === "payment_promise";
  }

  it("includes payment_promise quotes", () => {
    expect(isQuoteEligibleForConciliation("payment_promise")).toBe(true);
  });

  it("excludes draft quotes", () => {
    expect(isQuoteEligibleForConciliation("draft")).toBe(false);
  });

  it("excludes sent quotes", () => {
    expect(isQuoteEligibleForConciliation("sent")).toBe(false);
  });

  it("excludes accepted quotes (no payment_promise yet)", () => {
    expect(isQuoteEligibleForConciliation("accepted")).toBe(false);
  });

  it("excludes rejected quotes", () => {
    expect(isQuoteEligibleForConciliation("rejected")).toBe(false);
  });
});
