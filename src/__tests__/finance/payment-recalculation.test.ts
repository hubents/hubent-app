/**
 * Tests for payment recalculation logic across document types.
 * Validates that paidAmount changes correctly determine target status,
 * with special handling for quotes (revert to payment_promise) vs invoices (revert to sent).
 */
import { describe, it, expect } from "vitest";

/**
 * Pure logic replica of recalculateDocumentPayments status determination.
 * Mirrors the logic in src/lib/finance.ts lines 1076-1090.
 */
function determineTargetStatus(
  totalPaid: number,
  docTotal: number,
  currentStatus: string,
  docType: "invoice" | "quote" | "proforma"
): string | null {
  if (totalPaid <= 0) {
    if (currentStatus === "paid" || currentStatus === "partial") {
      return docType === "quote" ? "payment_promise" : "sent";
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

describe("Invoice Payment Recalculation", () => {
  it("transitions sent → partial on first partial payment", () => {
    expect(determineTargetStatus(500, 1000, "sent", "invoice")).toBe("partial");
  });

  it("transitions sent → paid on full payment", () => {
    expect(determineTargetStatus(1000, 1000, "sent", "invoice")).toBe("paid");
  });

  it("transitions partial → paid when fully paid", () => {
    expect(determineTargetStatus(1000, 1000, "partial", "invoice")).toBe("paid");
  });

  it("handles overpayment as paid", () => {
    expect(determineTargetStatus(1500, 1000, "partial", "invoice")).toBe("paid");
  });

  it("reverts paid → sent when all payments removed", () => {
    expect(determineTargetStatus(0, 1000, "paid", "invoice")).toBe("sent");
  });

  it("reverts partial → sent when all payments removed", () => {
    expect(determineTargetStatus(0, 1000, "partial", "invoice")).toBe("sent");
  });

  it("is idempotent when already partial", () => {
    expect(determineTargetStatus(500, 1000, "partial", "invoice")).toBeNull();
  });

  it("is idempotent when already paid", () => {
    expect(determineTargetStatus(1000, 1000, "paid", "invoice")).toBeNull();
  });

  it("does nothing for sent status with no payments", () => {
    expect(determineTargetStatus(0, 1000, "sent", "invoice")).toBeNull();
  });

  it("does nothing for draft status with no payments", () => {
    expect(determineTargetStatus(0, 1000, "draft", "invoice")).toBeNull();
  });
});

describe("Quote Payment Recalculation", () => {
  it("transitions payment_promise → partial on first partial payment", () => {
    expect(determineTargetStatus(500, 1000, "payment_promise", "quote")).toBe("partial");
  });

  it("transitions payment_promise → paid on full payment", () => {
    expect(determineTargetStatus(1000, 1000, "payment_promise", "quote")).toBe("paid");
  });

  it("transitions partial → paid when fully paid", () => {
    expect(determineTargetStatus(1000, 1000, "partial", "quote")).toBe("paid");
  });

  it("handles overpayment as paid", () => {
    expect(determineTargetStatus(1500, 1000, "partial", "quote")).toBe("paid");
  });

  it("reverts paid → payment_promise (NOT sent) when all payments removed", () => {
    expect(determineTargetStatus(0, 1000, "paid", "quote")).toBe("payment_promise");
    expect(determineTargetStatus(0, 1000, "paid", "quote")).not.toBe("sent");
  });

  it("reverts partial → payment_promise when all payments removed", () => {
    expect(determineTargetStatus(0, 1000, "partial", "quote")).toBe("payment_promise");
  });

  it("is idempotent when already partial", () => {
    expect(determineTargetStatus(500, 1000, "partial", "quote")).toBeNull();
  });

  it("is idempotent when already paid", () => {
    expect(determineTargetStatus(1000, 1000, "paid", "quote")).toBeNull();
  });

  it("does nothing for payment_promise status with no payments", () => {
    expect(determineTargetStatus(0, 1000, "payment_promise", "quote")).toBeNull();
  });
});

describe("Proforma Payment Recalculation", () => {
  it("behaves like invoice — reverts to sent, not payment_promise", () => {
    expect(determineTargetStatus(0, 1000, "paid", "proforma")).toBe("sent");
    expect(determineTargetStatus(0, 1000, "partial", "proforma")).toBe("sent");
  });

  it("transitions to partial and paid correctly", () => {
    expect(determineTargetStatus(500, 1000, "sent", "proforma")).toBe("partial");
    expect(determineTargetStatus(1000, 1000, "sent", "proforma")).toBe("paid");
  });
});

describe("Edge Cases", () => {
  it("handles zero total document with any payment as paid", () => {
    expect(determineTargetStatus(100, 0, "sent", "invoice")).toBe("paid");
  });

  it("handles negative totalPaid as zero (no change)", () => {
    expect(determineTargetStatus(-50, 1000, "sent", "invoice")).toBeNull();
  });

  it("handles very small fractional payments as partial", () => {
    expect(determineTargetStatus(0.01, 1000, "sent", "invoice")).toBe("partial");
  });

  it("handles exact match with floating point", () => {
    expect(determineTargetStatus(999.99, 1000, "sent", "invoice")).toBe("partial");
    expect(determineTargetStatus(1000.00, 1000, "sent", "invoice")).toBe("paid");
  });
});
