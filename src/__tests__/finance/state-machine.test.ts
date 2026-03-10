/**
 * Tests for the Finance State Machine transition rules.
 * These are pure logic tests that don't require DB access.
 */
import { describe, it, expect } from "vitest";

// Replicate the transition maps from finance.ts for testing
const QUOTE_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["accepted", "rejected"],
  accepted: ["payment_promise", "sent"],
  rejected: ["sent", "accepted"],
  payment_promise: ["accepted", "sent"],
};

const INVOICE_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["partial", "paid"],
  partial: ["paid", "sent"],
  paid: ["sent"],
};

function isValidTransition(
  docType: "quote" | "invoice",
  currentStatus: string,
  newStatus: string
): boolean {
  const transitions = docType === "quote" ? QUOTE_TRANSITIONS : INVOICE_TRANSITIONS;
  const allowed = transitions[currentStatus] || [];
  return allowed.includes(newStatus);
}

describe("Quote State Machine", () => {
  it("allows draft → sent", () => {
    expect(isValidTransition("quote", "draft", "sent")).toBe(true);
  });

  it("blocks draft → accepted (must go through sent)", () => {
    expect(isValidTransition("quote", "draft", "accepted")).toBe(false);
  });

  it("allows sent → accepted", () => {
    expect(isValidTransition("quote", "sent", "accepted")).toBe(true);
  });

  it("allows sent → rejected", () => {
    expect(isValidTransition("quote", "sent", "rejected")).toBe(true);
  });

  it("blocks sent → paid (must go through payment_promise)", () => {
    expect(isValidTransition("quote", "sent", "paid")).toBe(false);
  });

  it("allows accepted → payment_promise", () => {
    expect(isValidTransition("quote", "accepted", "payment_promise")).toBe(true);
  });

  it("allows accepted → sent (re-negotiate)", () => {
    expect(isValidTransition("quote", "accepted", "sent")).toBe(true);
  });

  it("allows rejected → sent (re-send)", () => {
    expect(isValidTransition("quote", "rejected", "sent")).toBe(true);
  });

  it("allows rejected → accepted (direct accept)", () => {
    expect(isValidTransition("quote", "rejected", "accepted")).toBe(true);
  });

  it("allows payment_promise → accepted", () => {
    expect(isValidTransition("quote", "payment_promise", "accepted")).toBe(true);
  });

  it("allows payment_promise → sent", () => {
    expect(isValidTransition("quote", "payment_promise", "sent")).toBe(true);
  });

  it("blocks payment_promise → rejected", () => {
    expect(isValidTransition("quote", "payment_promise", "rejected")).toBe(false);
  });

  it("blocks payment_promise → partial (quotes never reach partial)", () => {
    expect(isValidTransition("quote", "payment_promise", "partial")).toBe(false);
  });

  it("blocks payment_promise → paid (quotes never reach paid)", () => {
    expect(isValidTransition("quote", "payment_promise", "paid")).toBe(false);
  });

  it("has no transitions from undefined statuses", () => {
    expect(isValidTransition("quote", "cancelled", "draft")).toBe(false);
  });
});

describe("Invoice State Machine", () => {
  it("allows draft → sent", () => {
    expect(isValidTransition("invoice", "draft", "sent")).toBe(true);
  });

  it("blocks draft → paid (must go through sent)", () => {
    expect(isValidTransition("invoice", "draft", "paid")).toBe(false);
  });

  it("allows sent → partial (partial payment)", () => {
    expect(isValidTransition("invoice", "sent", "partial")).toBe(true);
  });

  it("allows sent → paid (full payment)", () => {
    expect(isValidTransition("invoice", "sent", "paid")).toBe(true);
  });

  it("blocks sent → accepted (invoices don't use accepted)", () => {
    expect(isValidTransition("invoice", "sent", "accepted")).toBe(false);
  });

  it("allows partial → paid (complete payment)", () => {
    expect(isValidTransition("invoice", "partial", "paid")).toBe(true);
  });

  it("allows partial → sent (payment removed)", () => {
    expect(isValidTransition("invoice", "partial", "sent")).toBe(true);
  });

  it("blocks paid → partial (must go through sent)", () => {
    expect(isValidTransition("invoice", "paid", "partial")).toBe(false);
  });

  it("allows paid → sent (all payments removed)", () => {
    expect(isValidTransition("invoice", "paid", "sent")).toBe(true);
  });

  it("blocks paid → draft", () => {
    expect(isValidTransition("invoice", "paid", "draft")).toBe(false);
  });
});

describe("Document Number Generation Logic", () => {
  it("generates correct format PRES-YYYY-0001", () => {
    const year = new Date().getFullYear();
    const prefix = "PRES";
    const nextNum = 1;
    const result = `${prefix}-${year}-${nextNum.toString().padStart(4, "0")}`;
    expect(result).toBe(`PRES-${year}-0001`);
  });

  it("parses trailing number from document number", () => {
    const number = "FAC-2026-0042";
    const match = number.match(/(\d+)$/);
    expect(match).not.toBeNull();
    expect(parseInt(match![1], 10)).toBe(42);
  });

  it("increments correctly", () => {
    const number = "PRES-2026-0099";
    const match = number.match(/(\d+)$/);
    const nextNum = parseInt(match![1], 10) + 1;
    expect(nextNum).toBe(100);
    expect(`PRES-2026-${nextNum.toString().padStart(4, "0")}`).toBe("PRES-2026-0100");
  });
});

describe("Payment Recalculation Logic", () => {
  function determineStatus(
    totalPaid: number,
    docTotal: number,
    currentStatus: string,
    docType: "invoice" | "quote" = "invoice"
  ): string | null {
    if (docType === "quote") {
      // Quotes never transition to partial/paid.
      // Only revert if somehow stuck in an invalid state.
      if (currentStatus === "paid" || currentStatus === "partial") {
        return "payment_promise";
      }
      return null;
    }
    // Invoice logic
    if (totalPaid <= 0) {
      if (currentStatus === "paid" || currentStatus === "partial") {
        return "sent";
      }
      return null;
    } else if (totalPaid < docTotal) {
      if (currentStatus !== "partial") return "partial";
      return null;
    } else {
      if (currentStatus !== "paid") return "paid";
      return null;
    }
  }

  it("sets invoice status to 'paid' when totalPaid >= docTotal", () => {
    expect(determineStatus(1000, 1000, "sent", "invoice")).toBe("paid");
    expect(determineStatus(1500, 1000, "partial", "invoice")).toBe("paid");
  });

  it("sets invoice status to 'partial' when 0 < totalPaid < docTotal", () => {
    expect(determineStatus(500, 1000, "sent", "invoice")).toBe("partial");
  });

  it("returns null if invoice already in correct status", () => {
    expect(determineStatus(500, 1000, "partial", "invoice")).toBeNull();
    expect(determineStatus(1000, 1000, "paid", "invoice")).toBeNull();
  });

  it("resets invoice to 'sent' when all payments removed", () => {
    expect(determineStatus(0, 1000, "paid", "invoice")).toBe("sent");
    expect(determineStatus(0, 1000, "partial", "invoice")).toBe("sent");
  });

  it("does nothing if invoice already sent and no payments", () => {
    expect(determineStatus(0, 1000, "sent", "invoice")).toBeNull();
  });

  it("quote never transitions to partial/paid regardless of payment amount", () => {
    expect(determineStatus(500, 1000, "payment_promise", "quote")).toBeNull();
    expect(determineStatus(1000, 1000, "payment_promise", "quote")).toBeNull();
  });

  it("does nothing if quote in payment_promise and no payments", () => {
    expect(determineStatus(0, 1000, "payment_promise", "quote")).toBeNull();
  });

  it("reverts quote from invalid paid/partial state to payment_promise", () => {
    expect(determineStatus(0, 1000, "paid", "quote")).toBe("payment_promise");
    expect(determineStatus(500, 1000, "partial", "quote")).toBe("payment_promise");
  });
});

describe("Document Total Calculation Logic", () => {
  function calculateTotals(
    items: Array<{ quantity: number; unitPrice: number; discount?: number; taxRate?: number }>,
    globalDiscount = 0,
    globalDiscountType: "percentage" | "fixed" = "percentage"
  ) {
    let subtotalLines = 0;
    let taxAmount = 0;

    const itemsWithTotals = items.map((item) => {
      const itemSubtotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
      subtotalLines += itemSubtotal;
      return { ...item, total: itemSubtotal };
    });

    let globalDiscountAmount = 0;
    if (globalDiscount > 0) {
      globalDiscountAmount = globalDiscountType === "percentage"
        ? subtotalLines * (globalDiscount / 100)
        : globalDiscount;
    }
    const subtotalAfterDiscount = subtotalLines - globalDiscountAmount;

    itemsWithTotals.forEach((item) => {
      const itemProportion = subtotalLines > 0 ? item.total / subtotalLines : 0;
      const itemTaxableAmount = subtotalAfterDiscount * itemProportion;
      taxAmount += itemTaxableAmount * ((item.taxRate || 21) / 100);
    });

    const total = subtotalAfterDiscount + taxAmount;
    return { subtotal: subtotalLines, taxAmount, total, globalDiscountAmount };
  }

  it("calculates simple invoice correctly", () => {
    const result = calculateTotals([{ quantity: 1, unitPrice: 100, taxRate: 21 }]);
    expect(result.subtotal).toBe(100);
    expect(result.taxAmount).toBe(21);
    expect(result.total).toBe(121);
  });

  it("applies item discount correctly", () => {
    const result = calculateTotals([{ quantity: 2, unitPrice: 100, discount: 10, taxRate: 21 }]);
    expect(result.subtotal).toBe(180); // 2*100*(1-0.1)
    expect(result.taxAmount).toBeCloseTo(37.8); // 180 * 0.21
    expect(result.total).toBeCloseTo(217.8);
  });

  it("applies global percentage discount", () => {
    const result = calculateTotals(
      [{ quantity: 1, unitPrice: 1000, taxRate: 21 }],
      10,
      "percentage"
    );
    expect(result.globalDiscountAmount).toBe(100);
    expect(result.total).toBeCloseTo(1089); // (1000-100)*1.21
  });

  it("applies global fixed discount", () => {
    const result = calculateTotals(
      [{ quantity: 1, unitPrice: 1000, taxRate: 21 }],
      50,
      "fixed"
    );
    expect(result.globalDiscountAmount).toBe(50);
    expect(result.total).toBeCloseTo(1149.5); // (1000-50)*1.21
  });

  it("handles zero-price items", () => {
    const result = calculateTotals([{ quantity: 5, unitPrice: 0, taxRate: 21 }]);
    expect(result.subtotal).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(0);
  });

  it("handles multiple items with different tax rates", () => {
    const result = calculateTotals([
      { quantity: 1, unitPrice: 100, taxRate: 21 },
      { quantity: 1, unitPrice: 100, taxRate: 10 },
    ]);
    expect(result.subtotal).toBe(200);
    expect(result.taxAmount).toBeCloseTo(31); // 100*0.21 + 100*0.10
    expect(result.total).toBeCloseTo(231);
  });
});

describe("Credit Note Calculation Logic", () => {
  it("generates negative amounts", () => {
    const originalItems = [
      { quantity: 2, unitPrice: 100, discount: 0, taxRate: 21 },
    ];

    let subtotal = 0;
    let taxAmount = 0;

    const creditItems = originalItems.map((item) => {
      const itemSubtotal = -(item.quantity * item.unitPrice * (1 - item.discount / 100));
      const itemTax = itemSubtotal * (item.taxRate / 100);
      subtotal += itemSubtotal;
      taxAmount += itemTax;
      return { ...item, total: itemSubtotal, unitPrice: -item.unitPrice };
    });

    const total = subtotal + taxAmount;

    expect(subtotal).toBe(-200);
    expect(taxAmount).toBe(-42);
    expect(total).toBe(-242);
    expect(creditItems[0].unitPrice).toBe(-100);
  });
});

describe("Direction Inference Logic", () => {
  function inferDirection(
    explicitDirection: string | undefined,
    vendorId: number | undefined
  ): string {
    return explicitDirection || (vendorId ? "incoming" : "outgoing");
  }

  it("defaults to outgoing when no vendor", () => {
    expect(inferDirection(undefined, undefined)).toBe("outgoing");
  });

  it("infers incoming when vendorId is set", () => {
    expect(inferDirection(undefined, 5)).toBe("incoming");
  });

  it("uses explicit direction when provided", () => {
    expect(inferDirection("outgoing", 5)).toBe("outgoing");
  });
});
