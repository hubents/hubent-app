import { db } from "@/db";
import { 
  financialDocuments, 
  documentItems,
  productCatalog,
  bankAccounts,
  paymentRecords,
  paymentSchedules,
  paymentReminders,
  companies,
  people,
  events,
  contacts,
  vendors,
} from "@/db/schema";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import type { TenantSession, PaginationParams, FilterParams } from "@/types";
import { syncDocumentStatus, syncPaymentCrossOrg, deleteMirrorPayment } from "@/lib/cross-org-finance";

// ============================================
// DOCUMENT NUMBER GENERATION
// ============================================

async function generateDocumentNumber(
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

  // Get the last document number for this type and year
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

  let nextNumber = 1;
  if (lastDoc?.number) {
    const match = lastDoc.number.match(/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}-${year}-${nextNumber.toString().padStart(4, "0")}`;
}

// ============================================
// PRODUCT CATALOG
// ============================================

export async function getProducts(
  session: TenantSession,
  params: PaginationParams & FilterParams = {}
) {
  const { page = 1, limit = 50, search } = params;
  const offset = (page - 1) * limit;

  let whereClause = and(
    eq(productCatalog.organizationId, session.organizationId),
    eq(productCatalog.isActive, true)
  );

  const results = await db
    .select()
    .from(productCatalog)
    .where(whereClause)
    .orderBy(desc(productCatalog.createdAt))
    .limit(limit)
    .offset(offset);

  return results;
}

export async function createProduct(
  session: TenantSession,
  data: {
    name: string;
    description?: string;
    sku?: string;
    category?: string;
    unitPrice?: number;
    taxRate?: number;
    unit?: string;
  }
) {
  const [product] = await db.insert(productCatalog).values({
    organizationId: session.organizationId,
    name: data.name,
    description: data.description,
    sku: data.sku,
    category: data.category,
    unitPrice: data.unitPrice?.toString(),
    taxRate: data.taxRate?.toString() || "21",
    unit: data.unit || "unit",
  }).returning();

  return product;
}

export async function updateProduct(
  session: TenantSession,
  productId: number,
  data: Partial<{
    name: string;
    description: string;
    sku: string;
    category: string;
    unitPrice: number;
    taxRate: number;
    unit: string;
    isActive: boolean;
  }>
) {
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  
  if (data.unitPrice !== undefined) {
    updateData.unitPrice = data.unitPrice.toString();
  }
  if (data.taxRate !== undefined) {
    updateData.taxRate = data.taxRate.toString();
  }

  const [updated] = await db.update(productCatalog)
    .set(updateData)
    .where(
      and(
        eq(productCatalog.id, productId),
        eq(productCatalog.organizationId, session.organizationId)
      )
    )
    .returning();

  return updated;
}

// ============================================
// BANK ACCOUNTS
// ============================================

export async function getBankAccounts(session: TenantSession) {
  return db.query.bankAccounts.findMany({
    where: (b, { eq, and }) => 
      and(
        eq(b.organizationId, session.organizationId),
        eq(b.isActive, true)
      ),
  });
}

export async function createBankAccount(
  session: TenantSession,
  data: {
    name: string;
    bankName?: string;
    bankIcon?: string;
    iban?: string;
    swift?: string;
    isDefault?: boolean;
  }
) {
  // If this is default, unset other defaults
  if (data.isDefault) {
    await db.update(bankAccounts)
      .set({ isDefault: false })
      .where(eq(bankAccounts.organizationId, session.organizationId));
  }

  const [account] = await db.insert(bankAccounts).values({
    organizationId: session.organizationId,
    ...data,
  }).returning();

  return account;
}

// ============================================
// FINANCIAL DOCUMENTS
// ============================================

export async function getDocuments(
  session: TenantSession,
  params: PaginationParams & FilterParams & { type?: string; direction?: string; search?: string } = {}
) {
  const { page = 1, limit = 50, type, status, direction, search } = params;
  const offset = (page - 1) * limit;

  let whereClause = eq(financialDocuments.organizationId, session.organizationId);

  if (type) {
    whereClause = and(whereClause, eq(financialDocuments.type, type as any))!;
  }

  if (status) {
    whereClause = and(whereClause, eq(financialDocuments.status, status as any))!;
  }

  if (direction) {
    if (direction === "outgoing") {
      whereClause = and(whereClause, or(
        eq(financialDocuments.direction, "outgoing"),
        sql`${financialDocuments.direction} IS NULL`
      ))!;
    } else {
      whereClause = and(whereClause, eq(financialDocuments.direction, direction))!;
    }
  }

  // Exclude mirror documents from normal listings
  whereClause = and(whereClause, sql`${financialDocuments.sourceDocumentId} IS NULL`)!;

  if (search) {
    whereClause = and(
      whereClause,
      or(
        ilike(financialDocuments.number, `%${search}%`),
        ilike(contacts.name, `%${search}%`),
        ilike(companies.legalName, `%${search}%`),
        ilike(people.firstName, `%${search}%`),
      )
    )!;
  }

  const results = await db
    .select({
      id: financialDocuments.id,
      type: financialDocuments.type,
      number: financialDocuments.number,
      status: financialDocuments.status,
      companyId: financialDocuments.companyId,
      personId: financialDocuments.personId,
      contactId: financialDocuments.contactId,
      vendorId: financialDocuments.vendorId,
      eventId: financialDocuments.eventId,
      direction: financialDocuments.direction,
      issueDate: financialDocuments.issueDate,
      dueDate: financialDocuments.dueDate,
      validUntil: financialDocuments.validUntil,
      subtotal: financialDocuments.subtotal,
      taxAmount: financialDocuments.taxAmount,
      total: financialDocuments.total,
      paidAmount: financialDocuments.paidAmount,
      currency: financialDocuments.currency,
      globalDiscount: financialDocuments.globalDiscount,
      globalDiscountType: financialDocuments.globalDiscountType,
      createdAt: financialDocuments.createdAt,
      companyName: companies.legalName,
      personFirstName: people.firstName,
      personLastName: people.lastName,
      contactName: contacts.name,
      vendorName: vendors.name,
      eventName: events.name,
    })
    .from(financialDocuments)
    .leftJoin(companies, eq(financialDocuments.companyId, companies.id))
    .leftJoin(people, eq(financialDocuments.personId, people.id))
    .leftJoin(contacts, eq(financialDocuments.contactId, contacts.id))
    .leftJoin(vendors, eq(financialDocuments.vendorId, vendors.id))
    .leftJoin(events, eq(financialDocuments.eventId, events.id))
    .where(whereClause)
    .orderBy(desc(financialDocuments.createdAt))
    .limit(limit)
    .offset(offset);

  const countQuery = await db
    .select({ count: sql<number>`count(*)` })
    .from(financialDocuments)
    .leftJoin(contacts, eq(financialDocuments.contactId, contacts.id))
    .leftJoin(companies, eq(financialDocuments.companyId, companies.id))
    .leftJoin(people, eq(financialDocuments.personId, people.id))
    .where(whereClause);

  const total = Number(countQuery[0]?.count || 0);

  return {
    data: results,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getDocument(session: TenantSession, documentId: number) {
  const doc = await db.query.financialDocuments.findFirst({
    where: (d, { eq, and }) => 
      and(
        eq(d.id, documentId),
        eq(d.organizationId, session.organizationId)
      ),
  });

  if (!doc) return null;

  // Get items
  const items = await db.query.documentItems.findMany({
    where: (i, { eq }) => eq(i.documentId, documentId),
    orderBy: (i, { asc }) => [asc(i.sortOrder)],
  });

  // Get related entities
  const company = doc.companyId 
    ? await db.query.companies.findFirst({ where: (c, { eq }) => eq(c.id, doc.companyId!) })
    : null;

  const person = doc.personId
    ? await db.query.people.findFirst({ where: (p, { eq }) => eq(p.id, doc.personId!) })
    : null;

  const event = doc.eventId
    ? await db.query.events.findFirst({ where: (e, { eq }) => eq(e.id, doc.eventId!) })
    : null;

  const contact = doc.contactId
    ? await db.query.contacts.findFirst({ where: (c, { eq }) => eq(c.id, doc.contactId!) })
    : null;

  const vendor = doc.vendorId
    ? await db.query.vendors.findFirst({ where: (v, { eq }) => eq(v.id, doc.vendorId!) })
    : null;

  const fullContactAddress = contact
    ? [contact.address, contact.postalCode, contact.city, contact.country].filter(Boolean).join(", ")
    : null;

  const fullVendorAddress = vendor?.address || null;

  return {
    ...doc,
    items,
    company,
    person,
    event,
    contact,
    vendor,
    contactName: contact?.name || null,
    contactEmail: contact?.email || null,
    contactPhone: contact?.phone || null,
    contactAddress: fullContactAddress || null,
    contactTaxId: contact?.taxId || contact?.nieOrCif || null,
    vendorName: vendor?.name || null,
    vendorEmail: vendor?.email || null,
    vendorPhone: vendor?.phone || null,
    vendorAddress: fullVendorAddress || null,
    eventName: event?.name || null,
    companyName: company?.tradeName || company?.legalName || null,
    personFirstName: person?.firstName || null,
    personLastName: person?.lastName || null,
  };
}

export async function createDocument(
  session: TenantSession,
  data: {
    type: "quote" | "proforma" | "invoice" | "delivery_note" | "credit_note";
    contactId?: number;
    vendorId?: number;
    companyId?: number;
    personId?: number;
    eventId?: number;
    dueDate?: Date;
    validUntil?: Date;
    notes?: string;
    termsAndConditions?: string;
    globalDiscount?: number;
    globalDiscountType?: "percentage" | "fixed";
    paymentMethod?: string;
    bankAccountId?: number;
    direction?: "incoming" | "outgoing";
    status?: "draft" | "approved";
    items: Array<{
      productId?: number;
      description: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
      taxRate?: number;
    }>;
  }
) {
  // Generate document number
  const number = await generateDocumentNumber(session.organizationId, data.type);

  // Calculate totals
  let subtotalLines = 0;
  let taxAmount = 0;

  const itemsWithTotals = data.items.map((item, index) => {
    const itemSubtotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
    subtotalLines += itemSubtotal;

    return {
      ...item,
      total: itemSubtotal,
      sortOrder: index,
    };
  });

  // Apply global discount
  const globalDiscountValue = data.globalDiscount || 0;
  const globalDiscountType = data.globalDiscountType || "percentage";
  let globalDiscountAmount = 0;
  if (globalDiscountValue > 0) {
    globalDiscountAmount = globalDiscountType === "percentage"
      ? subtotalLines * (globalDiscountValue / 100)
      : globalDiscountValue;
  }
  const subtotalAfterDiscount = subtotalLines - globalDiscountAmount;

  // Calculate tax on subtotal after global discount
  itemsWithTotals.forEach((item) => {
    const itemProportion = subtotalLines > 0 ? item.total / subtotalLines : 0;
    const itemTaxableAmount = subtotalAfterDiscount * itemProportion;
    taxAmount += itemTaxableAmount * ((item.taxRate || 21) / 100);
  });

  const total = subtotalAfterDiscount + taxAmount;

  // Infer direction from contact/vendor if not provided
  const direction = data.direction || (data.vendorId ? "incoming" : "outgoing");

  // Create document
  const [doc] = await db.insert(financialDocuments).values({
    organizationId: session.organizationId,
    type: data.type,
    number,
    status: data.status || "sent",
    contactId: data.contactId,
    vendorId: data.vendorId,
    companyId: data.companyId,
    personId: data.personId,
    eventId: data.eventId,
    dueDate: data.dueDate,
    validUntil: data.validUntil,
    subtotal: subtotalLines.toString(),
    taxAmount: taxAmount.toString(),
    total: total.toString(),
    currency: "EUR",
    globalDiscount: globalDiscountValue.toString(),
    globalDiscountType,
    paymentMethod: data.paymentMethod,
    bankAccountId: data.bankAccountId,
    direction,
    notes: data.notes,
    termsAndConditions: data.termsAndConditions,
    createdBy: session.user.userId,
  }).returning();

  // Create items
  for (const item of itemsWithTotals) {
    await db.insert(documentItems).values({
      documentId: doc.id,
      productId: item.productId,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      discount: (item.discount || 0).toString(),
      taxRate: (item.taxRate || 21).toString(),
      total: item.total.toString(),
      sortOrder: item.sortOrder,
    });
  }

  return getDocument(session, doc.id);
}

// Allowed status transitions per document type
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
  paid: ["partial", "sent"],
};

export async function updateDocumentStatus(
  session: TenantSession,
  documentId: number,
  newStatus: string,
  options?: { skipValidation?: boolean }
) {
  // Get current document to validate transition
  const [doc] = await db
    .select({ status: financialDocuments.status, type: financialDocuments.type })
    .from(financialDocuments)
    .where(
      and(
        eq(financialDocuments.id, documentId),
        eq(financialDocuments.organizationId, session.organizationId)
      )
    )
    .limit(1);

  if (!doc) return null;

  // Validate transition unless skipped (used by system for payment-triggered changes)
  if (!options?.skipValidation) {
    const currentStatus = doc.status || "draft";
    const transitions = doc.type === "quote" ? QUOTE_TRANSITIONS : 
                        doc.type === "invoice" ? INVOICE_TRANSITIONS : null;

    if (transitions) {
      const allowed = transitions[currentStatus] || [];
      if (!allowed.includes(newStatus)) {
        throw new Error(
          `Cannot transition ${doc.type} from "${currentStatus}" to "${newStatus}". Allowed: ${allowed.join(", ") || "none"}`
        );
      }
    }
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date(),
  };

  // Set paidAt timestamp when marking as paid
  if (newStatus === "paid") {
    updateData.paidAt = new Date();
  }

  const [updated] = await db.update(financialDocuments)
    .set(updateData)
    .where(
      and(
        eq(financialDocuments.id, documentId),
        eq(financialDocuments.organizationId, session.organizationId)
      )
    )
    .returning();

  // Cross-org sync: propagate status to mirror/original (non-blocking)
  if (updated) {
    syncDocumentStatus(documentId).catch((e) =>
      console.error("Cross-org status sync failed:", e)
    );
  }

  return updated;
}

export async function updateDocument(
  session: TenantSession,
  documentId: number,
  data: {
    contactId?: number;
    vendorId?: number;
    eventId?: number;
    dueDate?: string;
    validUntil?: string;
    notes?: string;
    termsAndConditions?: string;
    globalDiscount?: number;
    globalDiscountType?: "percentage" | "fixed";
    paymentMethod?: string;
    bankAccountId?: number;
    direction?: "incoming" | "outgoing";
    items?: Array<{
      productId?: number;
      description: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
      taxRate?: number;
    }>;
  }
) {
  // Get current document to apply rules
  const currentDoc = await db.query.financialDocuments.findFirst({
    where: (d, { eq: e, and: a }) => a(e(d.id, documentId), e(d.organizationId, session.organizationId)),
    columns: { type: true, status: true },
  });
  if (!currentDoc) return null;

  // RULE: Block editing invoices with paid/partial status
  if (currentDoc.type === "invoice" && (currentDoc.status === "paid" || currentDoc.status === "partial")) {
    throw new Error("Cannot edit an invoice with payments. Remove payments first.");
  }

  // RULE: If quote is accepted/rejected/payment_promise and items or discount change, auto-reset to "sent"
  const isQuoteWithActiveStatus = currentDoc.type === "quote" && 
    ["accepted", "rejected", "payment_promise"].includes(currentDoc.status || "");
  const hasFinancialChanges = data.items !== undefined || data.globalDiscount !== undefined || data.globalDiscountType !== undefined;
  let autoResetStatus = false;
  if (isQuoteWithActiveStatus && hasFinancialChanges) {
    autoResetStatus = true;
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (autoResetStatus) {
    updateData.status = "sent";
  }

  if (data.contactId !== undefined) updateData.contactId = data.contactId || null;
  if (data.vendorId !== undefined) updateData.vendorId = data.vendorId || null;
  if (data.eventId !== undefined) updateData.eventId = data.eventId || null;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.validUntil !== undefined) updateData.validUntil = data.validUntil ? new Date(data.validUntil) : null;
  if (data.notes !== undefined) updateData.notes = data.notes || null;
  if (data.termsAndConditions !== undefined) updateData.termsAndConditions = data.termsAndConditions || null;
  if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod || null;
  if (data.bankAccountId !== undefined) updateData.bankAccountId = data.bankAccountId || null;
  if (data.direction !== undefined) updateData.direction = data.direction;
  if (data.globalDiscount !== undefined) updateData.globalDiscount = data.globalDiscount.toString();
  if (data.globalDiscountType !== undefined) updateData.globalDiscountType = data.globalDiscountType;

  // If items are provided, recalculate totals and replace items
  if (data.items && data.items.length > 0) {
    let subtotalLines = 0;
    let taxAmount = 0;

    const itemsWithTotals = data.items.map((item, index) => {
      const itemSubtotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
      subtotalLines += itemSubtotal;
      return { ...item, total: itemSubtotal, sortOrder: index };
    });

    // Apply global discount
    const globalDiscountValue = data.globalDiscount ?? 0;
    const globalDiscountType = data.globalDiscountType ?? "percentage";
    let globalDiscountAmount = 0;
    if (globalDiscountValue > 0) {
      globalDiscountAmount = globalDiscountType === "percentage"
        ? subtotalLines * (globalDiscountValue / 100)
        : globalDiscountValue;
    }
    const subtotalAfterDiscount = subtotalLines - globalDiscountAmount;

    itemsWithTotals.forEach((item) => {
      const itemProportion = subtotalLines > 0 ? item.total / subtotalLines : 0;
      const itemTaxableAmount = subtotalAfterDiscount * itemProportion;
      taxAmount += itemTaxableAmount * ((item.taxRate || 21) / 100);
    });

    const total = subtotalAfterDiscount + taxAmount;

    updateData.subtotal = subtotalLines.toString();
    updateData.taxAmount = taxAmount.toString();
    updateData.total = total.toString();

    // Delete old items and insert new ones
    await db.delete(documentItems).where(eq(documentItems.documentId, documentId));

    for (const item of itemsWithTotals) {
      await db.insert(documentItems).values({
        documentId,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        discount: (item.discount || 0).toString(),
        taxRate: (item.taxRate || 21).toString(),
        total: item.total.toString(),
        sortOrder: item.sortOrder,
      });
    }
  }

  const [updated] = await db.update(financialDocuments)
    .set(updateData)
    .where(
      and(
        eq(financialDocuments.id, documentId),
        eq(financialDocuments.organizationId, session.organizationId)
      )
    )
    .returning();

  return updated ? getDocument(session, documentId) : null;
}

export async function deleteDocument(
  session: TenantSession,
  documentId: number
) {
  // Validate: cannot delete invoices with payments
  const doc = await db.query.financialDocuments.findFirst({
    where: (d, { eq: e, and: a }) => a(e(d.id, documentId), e(d.organizationId, session.organizationId)),
    columns: { id: true, type: true, status: true },
  });

  if (!doc) return null;

  if (doc.type === "invoice" && (doc.status === "paid" || doc.status === "partial")) {
    throw new Error("Cannot delete an invoice with payments. Remove payments first.");
  }

  // Delete associated payment records for this document
  await db.delete(paymentRecords)
    .where(eq(paymentRecords.documentId, documentId));

  // Delete mirror document if exists (and its items/payments)
  const mirror = await db.query.financialDocuments.findFirst({
    where: (d, { eq: e }) => e(d.sourceDocumentId, documentId),
    columns: { id: true },
  });
  if (mirror) {
    await db.delete(paymentRecords).where(eq(paymentRecords.documentId, mirror.id));
    await db.delete(documentItems).where(eq(documentItems.documentId, mirror.id));
    await db.delete(financialDocuments).where(eq(financialDocuments.id, mirror.id));
  }

  // Delete document items
  await db.delete(documentItems)
    .where(eq(documentItems.documentId, documentId));

  // Delete the document
  const [deleted] = await db.delete(financialDocuments)
    .where(
      and(
        eq(financialDocuments.id, documentId),
        eq(financialDocuments.organizationId, session.organizationId)
      )
    )
    .returning();

  return deleted;
}

export async function duplicateDocument(
  session: TenantSession,
  documentId: number
) {
  const original = await getDocument(session, documentId);
  if (!original) throw new Error("Document not found");

  const newDoc = await createDocument(session, {
    type: original.type as "quote" | "invoice" | "proforma" | "delivery_note" | "credit_note",
    contactId: original.contactId ?? undefined,
    vendorId: original.vendorId ?? undefined,
    companyId: original.companyId ?? undefined,
    personId: original.personId ?? undefined,
    eventId: original.eventId ?? undefined,
    notes: original.notes ?? undefined,
    termsAndConditions: original.termsAndConditions ?? undefined,
    globalDiscount: parseFloat(original.globalDiscount || "0") || undefined,
    globalDiscountType: (original.globalDiscountType as "percentage" | "fixed") || undefined,
    paymentMethod: original.paymentMethod ?? undefined,
    bankAccountId: original.bankAccountId ?? undefined,
    direction: (original.direction as "incoming" | "outgoing") || undefined,
    items: original.items.map(item => ({
      productId: item.productId ?? undefined,
      description: item.description,
      quantity: parseFloat(item.quantity || "1"),
      unitPrice: parseFloat(item.unitPrice),
      discount: parseFloat(item.discount || "0"),
      taxRate: parseFloat(item.taxRate || "21"),
    })),
  });

  return newDoc;
}

export async function convertDocument(
  session: TenantSession,
  documentId: number,
  toType: "proforma" | "invoice" | "delivery_note"
) {
  const original = await getDocument(session, documentId);
  if (!original) throw new Error("Document not found");

  const isDeliveryNote = toType === "delivery_note";

  // Create new document based on original
  const newDoc = await createDocument(session, {
    type: toType,
    contactId: original.contactId ?? undefined,
    vendorId: original.vendorId ?? undefined,
    companyId: original.companyId ?? undefined,
    personId: original.personId ?? undefined,
    eventId: original.eventId ?? undefined,
    notes: original.notes ?? undefined,
    termsAndConditions: isDeliveryNote ? undefined : (original.termsAndConditions ?? undefined),
    globalDiscount: isDeliveryNote ? undefined : (parseFloat(original.globalDiscount || "0") || undefined),
    globalDiscountType: isDeliveryNote ? undefined : ((original.globalDiscountType as "percentage" | "fixed") || undefined),
    paymentMethod: isDeliveryNote ? undefined : (original.paymentMethod ?? undefined),
    bankAccountId: isDeliveryNote ? undefined : (original.bankAccountId ?? undefined),
    direction: (original.direction as "incoming" | "outgoing") || undefined,
    items: original.items.map(item => ({
      productId: item.productId ?? undefined,
      description: item.description,
      quantity: parseFloat(item.quantity || "1"),
      unitPrice: isDeliveryNote ? 0 : parseFloat(item.unitPrice),
      discount: isDeliveryNote ? 0 : parseFloat(item.discount || "0"),
      taxRate: isDeliveryNote ? 0 : parseFloat(item.taxRate || "21"),
    })),
  });

  // Link to parent
  if (newDoc) {
    await db.update(financialDocuments)
      .set({ parentDocumentId: documentId })
      .where(eq(financialDocuments.id, newDoc.id));
  }

  // If converting quote → invoice, auto-mark quote as accepted
  if (original.type === "quote" && toType === "invoice") {
    const quoteStatus = original.status;
    if (quoteStatus !== "accepted") {
      await updateDocumentStatus(session, documentId, "accepted", { skipValidation: true });
    }
  }

  return newDoc;
}

// ============================================
// CREDIT NOTE (FACTURA RECTIFICATIVA)
// ============================================

export async function createCreditNote(
  session: TenantSession,
  originalInvoiceId: number
) {
  const original = await getDocument(session, originalInvoiceId);
  if (!original) throw new Error("Invoice not found");
  if (original.type !== "invoice") throw new Error("Can only create credit note from invoice");

  // Generate credit note number
  const number = await generateDocumentNumber(session.organizationId, "credit_note");

  // Calculate totals with NEGATIVE amounts
  let subtotal = 0;
  let taxAmount = 0;

  const itemsWithTotals = original.items.map((item, index) => {
    const qty = parseFloat(item.quantity || "1");
    const price = parseFloat(item.unitPrice);
    const discount = parseFloat(item.discount || "0");
    const tax = parseFloat(item.taxRate || "21");
    
    // Negative amounts for credit note
    const itemSubtotal = -(qty * price * (1 - discount / 100));
    const itemTax = itemSubtotal * (tax / 100);
    subtotal += itemSubtotal;
    taxAmount += itemTax;

    return {
      productId: item.productId,
      description: item.description,
      quantity: qty,
      unitPrice: -price, // Negative price
      discount: discount,
      taxRate: tax,
      total: itemSubtotal,
      sortOrder: index,
    };
  });

  const total = subtotal + taxAmount;

  // Create credit note document
  const [doc] = await db.insert(financialDocuments).values({
    organizationId: session.organizationId,
    type: "credit_note",
    number,
    status: "draft",
    contactId: original.contactId,
    vendorId: original.vendorId,
    companyId: original.companyId,
    personId: original.personId,
    eventId: original.eventId,
    parentDocumentId: originalInvoiceId, // Reference to original invoice
    subtotal: subtotal.toString(),
    taxAmount: taxAmount.toString(),
    total: total.toString(),
    currency: original.currency || "EUR",
    notes: `Rectifica la factura ${original.number}`,
    termsAndConditions: original.termsAndConditions,
    createdBy: session.user.userId,
  }).returning();

  // Create items
  for (const item of itemsWithTotals) {
    await db.insert(documentItems).values({
      documentId: doc.id,
      productId: item.productId,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      discount: item.discount.toString(),
      taxRate: item.taxRate.toString(),
      total: item.total.toString(),
      sortOrder: item.sortOrder,
    });
  }

  return getDocument(session, doc.id);
}

// ============================================
// PAYMENT RECORDS
// ============================================

export async function getPaymentRecords(
  session: TenantSession,
  params: { documentId?: number; taskId?: number; eventId?: number; contactId?: number; direction?: string; status?: string; page?: number; limit?: number } = {}
) {
  let whereClause = eq(paymentRecords.organizationId, session.organizationId);

  if (params.documentId) {
    whereClause = and(whereClause, eq(paymentRecords.documentId, params.documentId))!;
  }

  if (params.taskId) {
    whereClause = and(whereClause, eq(paymentRecords.taskId, params.taskId))!;
  }

  if (params.eventId) {
    whereClause = and(whereClause, eq(paymentRecords.eventId, params.eventId))!;
  }

  if (params.contactId) {
    whereClause = and(whereClause, eq(paymentRecords.contactId, params.contactId))!;
  }

  if (params.direction) {
    whereClause = and(whereClause, eq(paymentRecords.direction, params.direction))!;
  }

  if (params.status) {
    whereClause = and(whereClause, eq(paymentRecords.status, params.status))!;
  }

  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(paymentRecords)
    .where(whereClause);

  const total = Number(countResult?.count || 0);
  const totalPages = Math.ceil(total / limit);

  const data = await db
    .select({
      id: paymentRecords.id,
      organizationId: paymentRecords.organizationId,
      documentId: paymentRecords.documentId,
      taskId: paymentRecords.taskId,
      vendorId: paymentRecords.vendorId,
      contactId: paymentRecords.contactId,
      eventId: paymentRecords.eventId,
      bankAccountId: paymentRecords.bankAccountId,
      amount: paymentRecords.amount,
      currency: paymentRecords.currency,
      direction: paymentRecords.direction,
      paymentDate: paymentRecords.paymentDate,
      paymentMethod: paymentRecords.paymentMethod,
      reference: paymentRecords.reference,
      stripePaymentId: paymentRecords.stripePaymentId,
      notes: paymentRecords.notes,
      status: paymentRecords.status,
      attachmentUrl: paymentRecords.attachmentUrl,
      attachmentName: paymentRecords.attachmentName,
      createdBy: paymentRecords.createdBy,
      createdAt: paymentRecords.createdAt,
      documentNumber: financialDocuments.number,
      documentType: financialDocuments.type,
      documentTotal: financialDocuments.total,
      contactName: contacts.name,
    })
    .from(paymentRecords)
    .leftJoin(financialDocuments, eq(paymentRecords.documentId, financialDocuments.id))
    .leftJoin(contacts, eq(paymentRecords.contactId, contacts.id))
    .where(whereClause)
    .orderBy(desc(paymentRecords.paymentDate))
    .limit(limit)
    .offset(offset);

  return { data, meta: { total, totalPages, page, limit } };
}

/**
 * Recalculate paidAmount and status for a document based on its payment records.
 * Used after creating, updating, or deleting a payment.
 */
export async function recalculateDocumentPayments(
  session: TenantSession,
  documentId: number
) {
  const [doc] = await db
    .select({ id: financialDocuments.id, total: financialDocuments.total, status: financialDocuments.status })
    .from(financialDocuments)
    .where(eq(financialDocuments.id, documentId))
    .limit(1);

  if (!doc) return;

  const paymentsResult = await getPaymentRecords(session, { documentId });
  const totalPaid = paymentsResult.data.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const docTotal = parseFloat(doc.total || "0");

  // Update paidAmount
  await db
    .update(financialDocuments)
    .set({
      paidAmount: totalPaid.toString(),
      updatedAt: new Date(),
    })
    .where(eq(financialDocuments.id, documentId));

  // Determine correct status
  let targetStatus: string | null = null;
  if (totalPaid <= 0) {
    if (doc.status === "paid" || doc.status === "partial") {
      targetStatus = "sent";
    }
  } else if (totalPaid < docTotal) {
    if (doc.status !== "partial") {
      targetStatus = "partial";
    }
  } else {
    if (doc.status !== "paid") {
      targetStatus = "paid";
    }
  }

  if (targetStatus) {
    await updateDocumentStatus(session, documentId, targetStatus, { skipValidation: true });
  }
}

export async function createPaymentRecord(
  session: TenantSession,
  data: {
    documentId?: number;
    taskId?: number;
    vendorId?: number;
    contactId?: number;
    eventId?: number;
    bankAccountId?: number;
    amount: number;
    currency?: string;
    direction?: "incoming" | "outgoing";
    paymentDate?: Date;
    paymentMethod?: string;
    reference?: string;
    stripePaymentId?: string;
    notes?: string;
    status?: string;
    attachmentUrl?: string;
    attachmentName?: string;
  }
) {
  const [record] = await db.insert(paymentRecords).values({
    organizationId: session.organizationId,
    documentId: data.documentId,
    taskId: data.taskId,
    vendorId: data.vendorId,
    contactId: data.contactId,
    eventId: data.eventId,
    bankAccountId: data.bankAccountId,
    amount: data.amount.toString(),
    currency: data.currency || "EUR",
    direction: data.direction || "incoming",
    paymentDate: data.paymentDate || new Date(),
    paymentMethod: data.paymentMethod,
    reference: data.reference,
    stripePaymentId: data.stripePaymentId,
    notes: data.notes,
    status: data.status || "complete",
    attachmentUrl: data.attachmentUrl,
    attachmentName: data.attachmentName,
    createdBy: session.user.userId,
  }).returning();

  // If linked to a document, recalculate paidAmount and status
  if (data.documentId) {
    await recalculateDocumentPayments(session, data.documentId);
  }

  // Cross-org sync: create mirror payment if document is linked cross-org (non-blocking)
  if (data.documentId) {
    syncPaymentCrossOrg(record.id).catch((e) =>
      console.error("Cross-org payment sync failed:", e)
    );
  }

  return record;
}

export async function updatePaymentRecord(
  session: TenantSession,
  paymentId: number,
  data: {
    amount?: number;
    paymentMethod?: string;
    paymentDate?: Date;
    reference?: string;
    notes?: string;
    status?: string;
    attachmentUrl?: string;
    attachmentName?: string;
  }
) {
  // Get existing record to verify ownership and get documentId
  const [existing] = await db
    .select({ id: paymentRecords.id, documentId: paymentRecords.documentId })
    .from(paymentRecords)
    .where(
      and(
        eq(paymentRecords.id, paymentId),
        eq(paymentRecords.organizationId, session.organizationId)
      )
    )
    .limit(1);

  if (!existing) throw new Error("Payment record not found");

  const updateData: Record<string, unknown> = {};
  if (data.amount !== undefined) updateData.amount = data.amount.toString();
  if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
  if (data.paymentDate !== undefined) updateData.paymentDate = data.paymentDate;
  if (data.reference !== undefined) updateData.reference = data.reference;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.attachmentUrl !== undefined) updateData.attachmentUrl = data.attachmentUrl;
  if (data.attachmentName !== undefined) updateData.attachmentName = data.attachmentName;

  const [updated] = await db.update(paymentRecords)
    .set(updateData)
    .where(
      and(
        eq(paymentRecords.id, paymentId),
        eq(paymentRecords.organizationId, session.organizationId)
      )
    )
    .returning();

  // Recalculate document totals if linked
  if (existing.documentId) {
    await recalculateDocumentPayments(session, existing.documentId);
  }

  return updated;
}

export async function deletePaymentRecord(
  session: TenantSession,
  paymentId: number
) {
  // Get existing record to verify ownership and get documentId
  const [existing] = await db
    .select({ id: paymentRecords.id, documentId: paymentRecords.documentId })
    .from(paymentRecords)
    .where(
      and(
        eq(paymentRecords.id, paymentId),
        eq(paymentRecords.organizationId, session.organizationId)
      )
    )
    .limit(1);

  if (!existing) throw new Error("Payment record not found");

  // Delete mirror payment first (non-blocking)
  await deleteMirrorPayment(paymentId).catch((e) =>
    console.error("Delete mirror payment failed:", e)
  );

  await db.delete(paymentRecords)
    .where(
      and(
        eq(paymentRecords.id, paymentId),
        eq(paymentRecords.organizationId, session.organizationId)
      )
    );

  // Recalculate document totals if linked
  if (existing.documentId) {
    await recalculateDocumentPayments(session, existing.documentId);
  }

  return { deleted: true };
}

// ============================================
// PAYMENT SCHEDULES
// ============================================

export async function getPaymentSchedules(
  session: TenantSession,
  params: { taskId?: number; eventId?: number; vendorId?: number } = {}
) {
  let whereClause = eq(paymentSchedules.organizationId, session.organizationId);

  if (params.taskId) {
    whereClause = and(whereClause, eq(paymentSchedules.taskId, params.taskId))!;
  }

  if (params.eventId) {
    whereClause = and(whereClause, eq(paymentSchedules.eventId, params.eventId))!;
  }

  if (params.vendorId) {
    whereClause = and(whereClause, eq(paymentSchedules.vendorId, params.vendorId))!;
  }

  return db
    .select()
    .from(paymentSchedules)
    .where(whereClause)
    .orderBy(paymentSchedules.dueDate);
}

export async function createPaymentSchedule(
  session: TenantSession,
  data: {
    taskId?: number;
    eventId?: number;
    vendorId?: number;
    name: string;
    amount: number;
    dueDate: Date;
    notes?: string;
  }
) {
  const [schedule] = await db.insert(paymentSchedules).values({
    organizationId: session.organizationId,
    taskId: data.taskId,
    eventId: data.eventId,
    vendorId: data.vendorId,
    name: data.name,
    amount: data.amount.toString(),
    dueDate: data.dueDate,
    notes: data.notes,
  }).returning();

  return schedule;
}

export async function markSchedulePaid(
  session: TenantSession,
  scheduleId: number,
  paymentRecordId: number
) {
  const [updated] = await db.update(paymentSchedules)
    .set({
      isPaid: true,
      paidAt: new Date(),
      paymentRecordId,
    })
    .where(
      and(
        eq(paymentSchedules.id, scheduleId),
        eq(paymentSchedules.organizationId, session.organizationId)
      )
    )
    .returning();

  return updated;
}
