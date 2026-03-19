import { db } from "@/db";
import { financialDocuments, documentItems, paymentRecords, organizations, events } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { notifyDocumentStatusChanged, notifyPaymentReceived } from "@/lib/push-notifications";
import { linkDocumentToTask } from "@/lib/finance-task-link";

/**
 * Create a mirror (copy) of a financial document in another organization.
 * Used when a vendor creates a quote/invoice for a planner's event.
 * The mirror has direction="incoming" in the target org.
 */
export async function createMirrorDocument(
  originalDocId: number,
  targetOrgId: number,
  eventId: number | null,
  vendorId: number | null
) {
  // Get original document
  const original = await db.query.financialDocuments.findFirst({
    where: eq(financialDocuments.id, originalDocId),
  });
  if (!original) throw new Error("Original document not found");

  // Check if mirror already exists
  const existingMirror = await db.query.financialDocuments.findFirst({
    where: and(
      eq(financialDocuments.sourceDocumentId, originalDocId),
      eq(financialDocuments.organizationId, targetOrgId)
    ),
  });
  if (existingMirror) return existingMirror;

  // Generate number in target org
  const number = await generateDocumentNumberForOrg(
    targetOrgId,
    original.type as "quote" | "proforma" | "invoice" | "delivery_note" | "credit_note"
  );

  // Create mirror document
  const [mirror] = await db.insert(financialDocuments).values({
    organizationId: targetOrgId,
    type: original.type,
    number,
    status: original.status,
    eventId,
    vendorId,
    contactId: null,
    companyId: null,
    personId: null,
    parentDocumentId: null,
    direction: "incoming",
    issueDate: original.issueDate,
    dueDate: original.dueDate,
    validUntil: original.validUntil,
    subtotal: original.subtotal,
    taxAmount: original.taxAmount,
    total: original.total,
    paidAmount: original.paidAmount,
    currency: original.currency,
    globalDiscount: original.globalDiscount,
    globalDiscountType: original.globalDiscountType,
    paymentMethod: original.paymentMethod,
    paymentTerms: original.paymentTerms,
    bankAccountId: null,
    notes: original.notes,
    termsAndConditions: original.termsAndConditions,
    sourceDocumentId: originalDocId,
    sourceOrgId: original.organizationId,
    createdBy: original.createdBy,
  }).returning();

  // Copy items
  const items = await db.query.documentItems.findMany({
    where: eq(documentItems.documentId, originalDocId),
  });

  for (const item of items) {
    await db.insert(documentItems).values({
      documentId: mirror.id,
      productId: null,
      taxRateId: null,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxRate: item.taxRate,
      total: item.total,
      sortOrder: item.sortOrder,
    });
  }

  // Auto-link mirror document to task in target org (non-blocking)
  if (eventId && vendorId) {
    linkDocumentToTask(
      targetOrgId,
      mirror.id,
      original.type,
      number,
      eventId,
      vendorId
    ).catch(() => {});
  }

  return mirror;
}

/**
 * Synchronize document status between an original and its mirror.
 * Called after updateDocumentStatus() on either side.
 */
export async function syncDocumentStatus(documentId: number) {
  const doc = await db.query.financialDocuments.findFirst({
    where: eq(financialDocuments.id, documentId),
    columns: { id: true, status: true, paidAmount: true, sourceDocumentId: true, sourceOrgId: true, organizationId: true },
  });
  if (!doc) return;

  let linkedDocId: number | null = null;

  if (doc.sourceDocumentId) {
    // This IS a mirror — sync status back to original
    linkedDocId = doc.sourceDocumentId;
  } else {
    // This is an original — find its mirror
    const mirror = await db.query.financialDocuments.findFirst({
      where: eq(financialDocuments.sourceDocumentId, documentId),
      columns: { id: true },
    });
    linkedDocId = mirror?.id ?? null;
  }

  if (!linkedDocId) return;

  // Update the linked document's status and paidAmount
  await db.update(financialDocuments)
    .set({
      status: doc.status,
      paidAmount: doc.paidAmount,
      updatedAt: new Date(),
    })
    .where(eq(financialDocuments.id, linkedDocId));

  // Send notification to the OTHER org about the status change (non-blocking)
  try {
    const linkedDoc = await db.query.financialDocuments.findFirst({
      where: eq(financialDocuments.id, linkedDocId),
      columns: { organizationId: true, type: true, number: true, eventId: true },
    });
    if (linkedDoc) {
      const sourceOrg = await db.query.organizations.findFirst({
        where: eq(organizations.id, doc.organizationId),
        columns: { name: true },
      });
      let eventName = "Evento";
      if (linkedDoc.eventId) {
        const evt = await db.query.events.findFirst({
          where: eq(events.id, linkedDoc.eventId),
          columns: { name: true },
        });
        if (evt?.name) eventName = evt.name;
      }
      notifyDocumentStatusChanged(
        linkedDoc.organizationId,
        linkedDoc.type || "quote",
        linkedDoc.number || "",
        doc.status || "sent",
        sourceOrg?.name || "Organización",
        eventName
      ).catch(() => {});
    }
  } catch {}
}

/**
 * Create a mirror payment record in the other org when a payment is made.
 * Called after createPaymentRecord() if the document has a sourceDocumentId.
 */
export async function syncPaymentCrossOrg(paymentRecordId: number) {
  const payment = await db.query.paymentRecords.findFirst({
    where: eq(paymentRecords.id, paymentRecordId),
  });
  if (!payment || !payment.documentId) return;

  // Get the document to find its linked counterpart
  const doc = await db.query.financialDocuments.findFirst({
    where: eq(financialDocuments.id, payment.documentId),
    columns: { id: true, sourceDocumentId: true, sourceOrgId: true, organizationId: true },
  });
  if (!doc) return;

  let linkedDocId: number | null = null;
  let targetOrgId: number | null = null;

  if (doc.sourceDocumentId) {
    // Payment on a mirror doc — sync to original
    linkedDocId = doc.sourceDocumentId;
    targetOrgId = doc.sourceOrgId;
  } else {
    // Payment on an original doc — sync to mirror
    const mirror = await db.query.financialDocuments.findFirst({
      where: eq(financialDocuments.sourceDocumentId, doc.id),
      columns: { id: true, organizationId: true },
    });
    if (mirror) {
      linkedDocId = mirror.id;
      targetOrgId = mirror.organizationId;
    }
  }

  if (!linkedDocId || !targetOrgId) return;

  // Check if mirror payment already exists
  const existingMirror = await db.query.paymentRecords.findFirst({
    where: eq(paymentRecords.sourcePaymentId, paymentRecordId),
  });
  if (existingMirror) return;

  // Create mirror payment
  const direction = payment.direction === "outgoing" ? "incoming" : "outgoing";

  await db.insert(paymentRecords).values({
    organizationId: targetOrgId,
    documentId: linkedDocId,
    taskId: null,
    vendorId: null,
    contactId: null,
    eventId: payment.eventId,
    bankAccountId: null,
    amount: payment.amount,
    currency: payment.currency,
    direction,
    paymentDate: payment.paymentDate,
    paymentMethod: payment.paymentMethod,
    reference: payment.reference,
    notes: payment.notes,
    status: payment.status,
    sourcePaymentId: paymentRecordId,
    sourceOrgId: payment.organizationId,
    createdBy: payment.createdBy,
  });

  // Sync paidAmount and status on BOTH documents
  // The original doc's paidAmount is already correct (recalculated by createPaymentRecord).
  // We need to recalculate the linked doc's paidAmount from its own payments.
  const linkedPayments = await db
    .select({ amount: paymentRecords.amount })
    .from(paymentRecords)
    .where(eq(paymentRecords.documentId, linkedDocId));

  const linkedPaidTotal = linkedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  await db.update(financialDocuments)
    .set({ paidAmount: linkedPaidTotal.toString(), updatedAt: new Date() })
    .where(eq(financialDocuments.id, linkedDocId));

  // Now sync status from original to mirror
  await syncDocumentStatus(payment.documentId);

  // Notify target org about the payment (non-blocking)
  try {
    const sourceOrg = await db.query.organizations.findFirst({
      where: eq(organizations.id, payment.organizationId),
      columns: { name: true },
    });
    const linkedDocData = await db.query.financialDocuments.findFirst({
      where: eq(financialDocuments.id, linkedDocId),
      columns: { number: true, eventId: true },
    });
    let eventName = "Evento";
    if (linkedDocData?.eventId) {
      const evt = await db.query.events.findFirst({
        where: eq(events.id, linkedDocData.eventId),
        columns: { name: true },
      });
      if (evt?.name) eventName = evt.name;
    }
    notifyPaymentReceived(
      targetOrgId,
      payment.amount,
      payment.currency || "EUR",
      linkedDocData?.number || null,
      sourceOrg?.name || "Organización",
      eventName
    ).catch(() => {});
  } catch {}
}

/**
 * Sync payment edits to the mirror payment when a payment is updated.
 * Called after updatePaymentRecord() if the document is linked cross-org.
 */
export async function syncPaymentEdit(paymentRecordId: number) {
  const payment = await db.query.paymentRecords.findFirst({
    where: eq(paymentRecords.id, paymentRecordId),
  });
  if (!payment) return;

  // Find the mirror payment
  const mirror = await db.query.paymentRecords.findFirst({
    where: eq(paymentRecords.sourcePaymentId, paymentRecordId),
    columns: { id: true, documentId: true },
  });

  if (!mirror) {
    // Maybe this IS the mirror — find the original's mirror of us
    if (!payment.sourcePaymentId) return;
    // This payment is a mirror; sync back to source
    const source = await db.query.paymentRecords.findFirst({
      where: eq(paymentRecords.id, payment.sourcePaymentId),
      columns: { id: true, documentId: true },
    });
    if (!source) return;

    await db.update(paymentRecords)
      .set({
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate,
        reference: payment.reference,
        notes: payment.notes,
        status: payment.status,
      })
      .where(eq(paymentRecords.id, source.id));

    // Recalculate source document paidAmount
    if (source.documentId) {
      const payments = await db
        .select({ amount: paymentRecords.amount })
        .from(paymentRecords)
        .where(eq(paymentRecords.documentId, source.documentId));
      const total = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      await db.update(financialDocuments)
        .set({ paidAmount: total.toString(), updatedAt: new Date() })
        .where(eq(financialDocuments.id, source.documentId));
    }
    return;
  }

  // Update the mirror payment with the new data
  await db.update(paymentRecords)
    .set({
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      reference: payment.reference,
      notes: payment.notes,
      status: payment.status,
    })
    .where(eq(paymentRecords.id, mirror.id));

  // Recalculate mirror document paidAmount
  if (mirror.documentId) {
    const payments = await db
      .select({ amount: paymentRecords.amount })
      .from(paymentRecords)
      .where(eq(paymentRecords.documentId, mirror.documentId));
    const total = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    await db.update(financialDocuments)
      .set({ paidAmount: total.toString(), updatedAt: new Date() })
      .where(eq(financialDocuments.id, mirror.documentId));
  }

  // Sync document status
  if (payment.documentId) {
    await syncDocumentStatus(payment.documentId);
  }
}

/**
 * Delete a mirror payment when the original is deleted.
 */
export async function deleteMirrorPayment(paymentRecordId: number) {
  const mirror = await db.query.paymentRecords.findFirst({
    where: eq(paymentRecords.sourcePaymentId, paymentRecordId),
    columns: { id: true, documentId: true },
  });

  if (!mirror) return;

  await db.delete(paymentRecords).where(eq(paymentRecords.id, mirror.id));

  // Recalculate linked document paidAmount and sync status
  if (mirror.documentId) {
    // Recalculate paidAmount from remaining payments on the mirror doc
    const remainingPayments = await db
      .select({ amount: paymentRecords.amount })
      .from(paymentRecords)
      .where(eq(paymentRecords.documentId, mirror.documentId));

    const newPaidTotal = remainingPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    await db.update(financialDocuments)
      .set({ paidAmount: newPaidTotal.toString(), updatedAt: new Date() })
      .where(eq(financialDocuments.id, mirror.documentId));

    // Sync status from original
    const doc = await db.query.financialDocuments.findFirst({
      where: eq(financialDocuments.id, mirror.documentId),
      columns: { id: true, sourceDocumentId: true },
    });
    if (doc?.sourceDocumentId) {
      await syncDocumentStatus(doc.sourceDocumentId);
    }
  }
}

/**
 * Get the linked document (mirror or original) for a given document.
 */
export async function getLinkedDocument(documentId: number) {
  const doc = await db.query.financialDocuments.findFirst({
    where: eq(financialDocuments.id, documentId),
    columns: { id: true, sourceDocumentId: true },
  });
  if (!doc) return null;

  if (doc.sourceDocumentId) {
    // This is a mirror — return original
    return db.query.financialDocuments.findFirst({
      where: eq(financialDocuments.id, doc.sourceDocumentId),
    });
  }

  // This is original — return mirror
  return db.query.financialDocuments.findFirst({
    where: eq(financialDocuments.sourceDocumentId, documentId),
  });
}

/**
 * Sync document edits (fields + items) from one document to its linked mirror/original.
 * Called after updateDocument() to keep both sides in sync.
 */
export async function syncDocumentEdit(documentId: number) {
  const doc = await db.query.financialDocuments.findFirst({
    where: eq(financialDocuments.id, documentId),
  });
  if (!doc) return;

  let linkedDocId: number | null = null;

  if (doc.sourceDocumentId) {
    linkedDocId = doc.sourceDocumentId;
  } else {
    const mirror = await db.query.financialDocuments.findFirst({
      where: eq(financialDocuments.sourceDocumentId, documentId),
      columns: { id: true },
    });
    linkedDocId = mirror?.id ?? null;
  }

  if (!linkedDocId) return;

  // Sync editable fields (not number, not organizationId, not direction)
  await db.update(financialDocuments)
    .set({
      status: doc.status,
      issueDate: doc.issueDate,
      dueDate: doc.dueDate,
      validUntil: doc.validUntil,
      subtotal: doc.subtotal,
      taxAmount: doc.taxAmount,
      total: doc.total,
      paidAmount: doc.paidAmount,
      currency: doc.currency,
      globalDiscount: doc.globalDiscount,
      globalDiscountType: doc.globalDiscountType,
      paymentMethod: doc.paymentMethod,
      paymentTerms: doc.paymentTerms,
      notes: doc.notes,
      termsAndConditions: doc.termsAndConditions,
      updatedAt: new Date(),
    })
    .where(eq(financialDocuments.id, linkedDocId));

  // Sync items: delete old, copy new
  await db.delete(documentItems).where(eq(documentItems.documentId, linkedDocId));

  const items = await db.query.documentItems.findMany({
    where: eq(documentItems.documentId, documentId),
  });

  for (const item of items) {
    await db.insert(documentItems).values({
      documentId: linkedDocId,
      productId: null,
      taxRateId: null,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxRate: item.taxRate,
      total: item.total,
      sortOrder: item.sortOrder,
    });
  }
}

// Helper: generate document number for a specific org (not requiring a session)
async function generateDocumentNumberForOrg(
  organizationId: number,
  type: "quote" | "proforma" | "invoice" | "delivery_note" | "credit_note"
): Promise<string> {
  const prefixes: Record<string, string> = {
    quote: "PRES",
    proforma: "PROF",
    invoice: "FAC",
    delivery_note: "ALB",
    credit_note: "ABONO",
  };

  const year = new Date().getFullYear();
  const prefix = prefixes[type];

  // Get the last document number for this type and year (DESC to get the highest)
  const [lastDoc] = await db
    .select({ number: financialDocuments.number })
    .from(financialDocuments)
    .where(
      and(
        eq(financialDocuments.organizationId, organizationId),
        eq(financialDocuments.type, type),
        sql`EXTRACT(YEAR FROM ${financialDocuments.createdAt}) = ${year}`
      )
    )
    .orderBy(desc(financialDocuments.id))
    .limit(1);

  let nextNum = 1;
  if (lastDoc?.number) {
    const match = lastDoc.number.match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  return `${prefix}-${year}-${nextNum.toString().padStart(4, "0")}`;
}
