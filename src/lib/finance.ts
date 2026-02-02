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
  events
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { TenantSession, PaginationParams, FilterParams } from "@/types";

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
  params: PaginationParams & FilterParams & { type?: string } = {}
) {
  const { page = 1, limit = 50, type, status } = params;
  const offset = (page - 1) * limit;

  let whereClause = eq(financialDocuments.organizationId, session.organizationId);

  if (type) {
    whereClause = and(whereClause, eq(financialDocuments.type, type as any))!;
  }

  if (status) {
    whereClause = and(whereClause, eq(financialDocuments.status, status as any))!;
  }

  const results = await db
    .select({
      id: financialDocuments.id,
      type: financialDocuments.type,
      number: financialDocuments.number,
      status: financialDocuments.status,
      companyId: financialDocuments.companyId,
      personId: financialDocuments.personId,
      eventId: financialDocuments.eventId,
      issueDate: financialDocuments.issueDate,
      dueDate: financialDocuments.dueDate,
      subtotal: financialDocuments.subtotal,
      taxAmount: financialDocuments.taxAmount,
      total: financialDocuments.total,
      currency: financialDocuments.currency,
      createdAt: financialDocuments.createdAt,
      companyName: companies.legalName,
      personFirstName: people.firstName,
      personLastName: people.lastName,
      eventName: events.name,
    })
    .from(financialDocuments)
    .leftJoin(companies, eq(financialDocuments.companyId, companies.id))
    .leftJoin(people, eq(financialDocuments.personId, people.id))
    .leftJoin(events, eq(financialDocuments.eventId, events.id))
    .where(whereClause)
    .orderBy(desc(financialDocuments.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(financialDocuments)
    .where(whereClause);

  return {
    data: results,
    meta: {
      page,
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit),
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

  return {
    ...doc,
    items,
    company,
    person,
    event,
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
  let subtotal = 0;
  let taxAmount = 0;

  const itemsWithTotals = data.items.map((item, index) => {
    const itemSubtotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
    const itemTax = itemSubtotal * ((item.taxRate || 21) / 100);
    subtotal += itemSubtotal;
    taxAmount += itemTax;

    return {
      ...item,
      total: itemSubtotal,
      sortOrder: index,
    };
  });

  const total = subtotal + taxAmount;

  // Create document
  const [doc] = await db.insert(financialDocuments).values({
    organizationId: session.organizationId,
    type: data.type,
    number,
    status: "draft",
    contactId: data.contactId,
    vendorId: data.vendorId,
    companyId: data.companyId,
    personId: data.personId,
    eventId: data.eventId,
    dueDate: data.dueDate,
    validUntil: data.validUntil,
    subtotal: subtotal.toString(),
    taxAmount: taxAmount.toString(),
    total: total.toString(),
    currency: "EUR",
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

export async function updateDocumentStatus(
  session: TenantSession,
  documentId: number,
  status: "draft" | "sent" | "accepted" | "rejected" | "paid" | "cancelled"
) {
  const [updated] = await db.update(financialDocuments)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(financialDocuments.id, documentId),
        eq(financialDocuments.organizationId, session.organizationId)
      )
    )
    .returning();

  return updated;
}

export async function updateDocument(
  session: TenantSession,
  documentId: number,
  data: {
    contactId?: number;
    eventId?: number;
    dueDate?: string;
    validUntil?: string;
    notes?: string;
    termsAndConditions?: string;
  }
) {
  const [updated] = await db.update(financialDocuments)
    .set({
      contactId: data.contactId,
      eventId: data.eventId,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      notes: data.notes,
      termsAndConditions: data.termsAndConditions,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(financialDocuments.id, documentId),
        eq(financialDocuments.organizationId, session.organizationId)
      )
    )
    .returning();

  return updated;
}

export async function deleteDocument(
  session: TenantSession,
  documentId: number
) {
  // First delete document items
  await db.delete(documentItems)
    .where(eq(documentItems.documentId, documentId));

  // Then delete the document
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
    eventId: original.eventId ?? undefined,
    notes: original.notes ?? undefined,
    termsAndConditions: original.termsAndConditions ?? undefined,
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
  toType: "proforma" | "invoice"
) {
  const original = await getDocument(session, documentId);
  if (!original) throw new Error("Document not found");

  // Create new document based on original
  const newDoc = await createDocument(session, {
    type: toType,
    companyId: original.companyId ?? undefined,
    personId: original.personId ?? undefined,
    eventId: original.eventId ?? undefined,
    notes: original.notes ?? undefined,
    termsAndConditions: original.termsAndConditions ?? undefined,
    items: original.items.map(item => ({
      productId: item.productId ?? undefined,
      description: item.description,
      quantity: parseFloat(item.quantity || "1"),
      unitPrice: parseFloat(item.unitPrice),
      discount: parseFloat(item.discount || "0"),
      taxRate: parseFloat(item.taxRate || "21"),
    })),
  });

  // Link to parent
  if (newDoc) {
    await db.update(financialDocuments)
      .set({ parentDocumentId: documentId })
      .where(eq(financialDocuments.id, newDoc.id));
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
  params: { documentId?: number; taskId?: number } = {}
) {
  let whereClause = eq(paymentRecords.organizationId, session.organizationId);

  if (params.documentId) {
    whereClause = and(whereClause, eq(paymentRecords.documentId, params.documentId))!;
  }

  if (params.taskId) {
    whereClause = and(whereClause, eq(paymentRecords.taskId, params.taskId))!;
  }

  return db
    .select()
    .from(paymentRecords)
    .where(whereClause)
    .orderBy(desc(paymentRecords.paymentDate));
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
    createdBy: session.user.userId,
  }).returning();

  // If linked to a document, check if fully paid
  if (data.documentId) {
    const doc = await db.query.financialDocuments.findFirst({
      where: (d, { eq }) => eq(d.id, data.documentId!),
    });

    if (doc) {
      const payments = await getPaymentRecords(session, { documentId: data.documentId });
      const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const docTotal = parseFloat(doc.total || "0");

      if (totalPaid >= docTotal) {
        await updateDocumentStatus(session, data.documentId, "paid");
      }
    }
  }

  return record;
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
