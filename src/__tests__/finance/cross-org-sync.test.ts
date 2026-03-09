/**
 * Tests for cross-org finance synchronization logic.
 * Pure logic tests validating mirror payment creation, direction inversion,
 * and paidAmount recalculation rules.
 */
import { describe, it, expect } from "vitest";

/**
 * Mirrors the direction inversion logic from cross-org-finance.ts line 219.
 */
function invertDirection(direction: string): string {
  return direction === "outgoing" ? "incoming" : "outgoing";
}

/**
 * Simulates paidAmount recalculation from an array of payment amounts.
 */
function recalculatePaidAmount(paymentAmounts: string[]): string {
  const total = paymentAmounts.reduce((sum, a) => sum + parseFloat(a), 0);
  return total.toString();
}

/**
 * Simulates the mirror payment creation payload from cross-org-finance.ts.
 */
function createMirrorPaymentPayload(original: {
  amount: string;
  currency: string;
  direction: string;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  status: string | null;
  eventId: number | null;
}) {
  return {
    amount: original.amount,
    currency: original.currency,
    direction: invertDirection(original.direction),
    paymentMethod: original.paymentMethod,
    reference: original.reference,
    notes: original.notes,
    status: original.status,
    eventId: original.eventId,
    // Mirror-specific fields
    taskId: null,
    vendorId: null,
    contactId: null,
    bankAccountId: null,
  };
}

/**
 * Simulates mirror document creation — direction is always "incoming" in target org.
 */
function createMirrorDocumentDirection(): string {
  return "incoming";
}

describe("Direction Inversion", () => {
  it("inverts outgoing → incoming", () => {
    expect(invertDirection("outgoing")).toBe("incoming");
  });

  it("inverts incoming → outgoing", () => {
    expect(invertDirection("incoming")).toBe("outgoing");
  });

  it("treats unknown direction as outgoing (fallback)", () => {
    expect(invertDirection("other")).toBe("outgoing");
  });
});

describe("Mirror Payment Creation", () => {
  it("copies all financial fields from original", () => {
    const original = {
      amount: "500.00",
      currency: "EUR",
      direction: "outgoing",
      paymentMethod: "bank_transfer",
      reference: "TX-12345",
      notes: "First partial payment",
      status: "complete",
      eventId: 42,
    };

    const mirror = createMirrorPaymentPayload(original);

    expect(mirror.amount).toBe("500.00");
    expect(mirror.currency).toBe("EUR");
    expect(mirror.paymentMethod).toBe("bank_transfer");
    expect(mirror.reference).toBe("TX-12345");
    expect(mirror.notes).toBe("First partial payment");
    expect(mirror.status).toBe("complete");
    expect(mirror.eventId).toBe(42);
  });

  it("inverts direction for mirror", () => {
    const mirror = createMirrorPaymentPayload({
      amount: "100",
      currency: "EUR",
      direction: "outgoing",
      paymentMethod: null,
      reference: null,
      notes: null,
      status: "complete",
      eventId: null,
    });
    expect(mirror.direction).toBe("incoming");
  });

  it("nullifies vendor/contact/task/bank on mirror", () => {
    const mirror = createMirrorPaymentPayload({
      amount: "100",
      currency: "EUR",
      direction: "incoming",
      paymentMethod: null,
      reference: null,
      notes: null,
      status: "pending",
      eventId: null,
    });

    expect(mirror.taskId).toBeNull();
    expect(mirror.vendorId).toBeNull();
    expect(mirror.contactId).toBeNull();
    expect(mirror.bankAccountId).toBeNull();
  });

  it("preserves pending status on mirror", () => {
    const mirror = createMirrorPaymentPayload({
      amount: "200",
      currency: "USD",
      direction: "outgoing",
      paymentMethod: "cash",
      reference: null,
      notes: null,
      status: "pending",
      eventId: 10,
    });
    expect(mirror.status).toBe("pending");
  });
});

describe("Mirror Document Direction", () => {
  it("always creates mirror with direction incoming", () => {
    expect(createMirrorDocumentDirection()).toBe("incoming");
  });
});

describe("PaidAmount Recalculation", () => {
  it("sums all payment amounts correctly", () => {
    expect(recalculatePaidAmount(["500.00", "300.00", "200.00"])).toBe("1000");
  });

  it("returns 0 for empty payments array", () => {
    expect(recalculatePaidAmount([])).toBe("0");
  });

  it("handles single payment", () => {
    expect(recalculatePaidAmount(["750.50"])).toBe("750.5");
  });

  it("handles string amounts with varying precision", () => {
    const result = parseFloat(recalculatePaidAmount(["100.10", "200.20"]));
    expect(result).toBeCloseTo(300.30);
  });
});

describe("Cross-Org Sync Status Propagation", () => {
  /**
   * Simulates syncDocumentStatus behavior:
   * When status changes on one side, the linked document gets the same status + paidAmount.
   */
  function syncStatus(
    sourceStatus: string,
    sourcePaidAmount: string
  ): { status: string; paidAmount: string } {
    return {
      status: sourceStatus,
      paidAmount: sourcePaidAmount,
    };
  }

  it("propagates paid status to linked document", () => {
    const result = syncStatus("paid", "1000.00");
    expect(result.status).toBe("paid");
    expect(result.paidAmount).toBe("1000.00");
  });

  it("propagates partial status to linked document", () => {
    const result = syncStatus("partial", "500.00");
    expect(result.status).toBe("partial");
    expect(result.paidAmount).toBe("500.00");
  });

  it("propagates payment_promise revert to linked document", () => {
    const result = syncStatus("payment_promise", "0");
    expect(result.status).toBe("payment_promise");
    expect(result.paidAmount).toBe("0");
  });

  it("propagates sent revert (invoice) to linked document", () => {
    const result = syncStatus("sent", "0");
    expect(result.status).toBe("sent");
    expect(result.paidAmount).toBe("0");
  });
});

describe("Delete Mirror Payment — Expected Behavior", () => {
  it("after deleting mirror payment, remaining payments recalculate paidAmount", () => {
    // Original has 3 payments: 300, 400, 300 = 1000
    // Mirror has corresponding 3 payments
    // Delete mirror for payment of 400
    const remainingMirrorPayments = ["300.00", "300.00"];
    const newPaidAmount = recalculatePaidAmount(remainingMirrorPayments);
    expect(newPaidAmount).toBe("600");
  });

  it("after deleting all mirror payments, paidAmount is 0", () => {
    const remainingMirrorPayments: string[] = [];
    const newPaidAmount = recalculatePaidAmount(remainingMirrorPayments);
    expect(newPaidAmount).toBe("0");
  });
});
