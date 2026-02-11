import { db } from "@/db";
import {
  contacts,
  contactDocuments,
  contactPhotos,
  contactActivities,
  contactTags,
  contactEvents,
  contactTasks,
  contactRelationships,
  users,
  events,
  tasks,
  leads,
  vendors,
} from "@/db/schema";
import { eq, and, desc, isNull, ilike, or, sql, inArray } from "drizzle-orm";
import type { TenantSession, PaginationParams, FilterParams } from "@/types";

// ============================================
// CONTACTS
// ============================================

export async function getContacts(
  session: TenantSession,
  params: PaginationParams & FilterParams & { type?: string; tags?: string[]; isLead?: boolean; isVendor?: boolean } = {}
) {
  const { page = 1, limit = 50, search, type, tags, isLead, isVendor } = params;
  const offset = (page - 1) * limit;

  let whereClause = and(
    eq(contacts.organizationId, session.organizationId),
    isNull(contacts.deletedAt)
  );

  if (search) {
    whereClause = and(
      whereClause,
      or(
        ilike(contacts.name, `%${search}%`),
        ilike(contacts.email, `%${search}%`),
        ilike(contacts.phone, `%${search}%`),
        ilike(contacts.tradeName, `%${search}%`)
      )
    );
  }

  if (type && (type === "person" || type === "company")) {
    whereClause = and(whereClause, eq(contacts.type, type));
  }

  if (isLead !== undefined) {
    whereClause = and(whereClause, eq(contacts.isLead, isLead));
  }

  if (isVendor !== undefined) {
    whereClause = and(whereClause, eq(contacts.isVendor, isVendor));
  }

  const results = await db
    .select({
      id: contacts.id,
      organizationId: contacts.organizationId,
      type: contacts.type,
      name: contacts.name,
      email: contacts.email,
      phone: contacts.phone,
      phoneCountryCode: contacts.phoneCountryCode,
      avatar: contacts.avatar,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      tradeName: contacts.tradeName,
      taxId: contacts.taxId,
      nieOrCif: contacts.nieOrCif,
      passportId: contacts.passportId,
      website: contacts.website,
      address: contacts.address,
      city: contacts.city,
      country: contacts.country,
      tags: contacts.tags,
      source: contacts.source,
      isLead: contacts.isLead,
      leadScore: contacts.leadScore,
      isVendor: contacts.isVendor,
      vendorCategory: contacts.vendorCategory,
      category: contacts.category,
      createdAt: contacts.createdAt,
      createdByName: users.name,
    })
    .from(contacts)
    .leftJoin(users, eq(contacts.createdBy, users.id))
    .where(whereClause)
    .orderBy(desc(contacts.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contacts)
    .where(whereClause);

  // Get stats (always for the full org, not filtered)
  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
      persons: sql<number>`count(*) filter (where type = 'person' and (is_vendor = false or is_vendor is null))`,
      companies: sql<number>`count(*) filter (where type = 'company' and (is_vendor = false or is_vendor is null))`,
      vendors: sql<number>`count(*) filter (where is_vendor = true)`,
    })
    .from(contacts)
    .where(
      and(
        eq(contacts.organizationId, session.organizationId),
        isNull(contacts.deletedAt)
      )
    );

  return {
    data: results,
    stats: {
      total: Number(stats?.total || 0),
      persons: Number(stats?.persons || 0),
      companies: Number(stats?.companies || 0),
      vendors: Number(stats?.vendors || 0),
    },
    meta: {
      page,
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit),
    },
  };
}

export async function getContact(session: TenantSession, contactId: number) {
  const contact = await db.query.contacts.findFirst({
    where: (c, { eq, and }) =>
      and(
        eq(c.id, contactId),
        eq(c.organizationId, session.organizationId),
        isNull(c.deletedAt)
      ),
  });

  if (!contact) return null;

  // Get documents
  const documents = await db
    .select()
    .from(contactDocuments)
    .where(eq(contactDocuments.contactId, contactId))
    .orderBy(desc(contactDocuments.uploadedAt));

  // Get photos
  const photos = await db
    .select()
    .from(contactPhotos)
    .where(eq(contactPhotos.contactId, contactId))
    .orderBy(contactPhotos.sortOrder);

  // Get activities
  const activities = await db
    .select({
      id: contactActivities.id,
      type: contactActivities.type,
      title: contactActivities.title,
      description: contactActivities.description,
      metadata: contactActivities.metadata,
      createdAt: contactActivities.createdAt,
      createdByName: users.name,
    })
    .from(contactActivities)
    .leftJoin(users, eq(contactActivities.createdBy, users.id))
    .where(eq(contactActivities.contactId, contactId))
    .orderBy(desc(contactActivities.createdAt))
    .limit(50);

  // Get linked events
  const linkedEvents = await db
    .select({
      id: contactEvents.id,
      eventId: contactEvents.eventId,
      role: contactEvents.role,
      eventName: events.name,
      eventDate: events.date,
      eventStatus: events.status,
    })
    .from(contactEvents)
    .innerJoin(events, eq(contactEvents.eventId, events.id))
    .where(eq(contactEvents.contactId, contactId));

  // Get linked tasks
  const linkedTasks = await db
    .select({
      id: contactTasks.id,
      taskId: contactTasks.taskId,
      role: contactTasks.role,
      taskTitle: tasks.title,
      taskStatus: tasks.status,
      taskDueDate: tasks.dueDate,
    })
    .from(contactTasks)
    .innerJoin(tasks, eq(contactTasks.taskId, tasks.id))
    .where(eq(contactTasks.contactId, contactId));

  // Get lead info if linked
  let lead = null;
  if (contact.leadId) {
    lead = await db.query.leads.findFirst({
      where: (l, { eq }) => eq(l.id, contact.leadId!),
    });
  }

  return {
    ...contact,
    documents,
    photos,
    activities,
    linkedEvents,
    linkedTasks,
    lead,
  };
}

export async function createContact(
  session: TenantSession,
  data: {
    type: "person" | "company";
    name: string;
    email?: string;
    phone?: string;
    phoneCountryCode?: string;
    avatar?: string;
    // Person fields
    firstName?: string;
    lastName?: string;
    passportId?: string;
    nieOrCif?: string;
    // Company fields
    tradeName?: string;
    taxId?: string;
    website?: string;
    contactPersonName?: string;
    contactPersonEmail?: string;
    // Event fields
    eventDate?: Date;
    guestCount?: number;
    budget?: number;
    venueType?: string;
    // Address fields
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    // Bank fields
    bankName?: string;
    bankAccountNumber?: string;
    bankIban?: string;
    bankSwift?: string;
    paymentMethods?: string[];
    // Marketing fields
    tags?: string[];
    source?: "manual" | "import" | "website" | "referral" | "social_media" | "event" | "other";
    isLead?: boolean;
    notes?: string;
    // Vendor fields (for contacts that offer services)
    isVendor?: boolean;
    vendorCategory?: string;
    // Category (for non-vendors)
    category?: string;
  }
) {
  // First create the contact
  const [contact] = await db
    .insert(contacts)
    .values({
      organizationId: session.organizationId,
      type: data.type,
      name: data.name,
      email: data.email,
      phone: data.phone,
      phoneCountryCode: data.phoneCountryCode || "+34",
      avatar: data.avatar,
      firstName: data.firstName,
      lastName: data.lastName,
      passportId: data.passportId,
      nieOrCif: data.nieOrCif,
      tradeName: data.tradeName,
      taxId: data.taxId,
      website: data.website,
      contactPersonName: data.contactPersonName,
      contactPersonEmail: data.contactPersonEmail,
      eventDate: data.eventDate,
      guestCount: data.guestCount,
      budget: data.budget?.toString(),
      venueType: data.venueType,
      address: data.address,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country || "ES",
      bankName: data.bankName,
      bankAccountNumber: data.bankAccountNumber,
      bankIban: data.bankIban,
      bankSwift: data.bankSwift,
      paymentMethods: data.paymentMethods,
      tags: data.tags,
      source: data.source || "manual",
      isLead: data.isLead || false,
      notes: data.notes,
      isVendor: data.isVendor || false,
      vendorCategory: data.vendorCategory,
      category: data.category,
      createdBy: session.user.userId,
    })
    .returning();

  // If contact is marked as vendor, create vendor record and link bidirectionally
  if (data.isVendor && data.vendorCategory) {
    const [vendor] = await db
      .insert(vendors)
      .values({
        organizationId: session.organizationId,
        name: data.name,
        category: data.vendorCategory,
        email: data.email,
        phone: data.phone,
        website: data.website,
        address: data.address,
        notes: data.notes,
        contactId: contact.id,
        createdBy: session.user.userId,
      })
      .returning();

    // Update contact with vendorId
    await db
      .update(contacts)
      .set({ vendorId: vendor.id })
      .where(eq(contacts.id, contact.id));

    contact.vendorId = vendor.id;
  }

  // Log activity
  await createContactActivity(contact.id, {
    type: "note",
    title: "Contacto creado",
    description: `Contacto ${data.type === "person" ? "persona" : "empresa"} creado${data.isVendor ? " (proveedor)" : ""}`,
    createdBy: session.user.userId,
  });

  return contact;
}

function contactId(id: number) {
  return id;
}

export async function updateContact(
  session: TenantSession,
  contactId: number,
  data: Partial<{
    type: "person" | "company";
    name: string;
    email: string;
    phone: string;
    phoneCountryCode: string;
    avatar: string;
    firstName: string;
    lastName: string;
    passportId: string;
    nieOrCif: string;
    tradeName: string;
    taxId: string;
    website: string;
    contactPersonName: string;
    contactPersonEmail: string;
    eventDate: Date;
    guestCount: number;
    budget: number;
    venueType: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    bankName: string;
    bankAccountNumber: string;
    bankIban: string;
    bankSwift: string;
    paymentMethods: string[];
    tags: string[];
    source: string;
    isLead: boolean;
    leadScore: number;
    notes: string;
    category: string;
    isVendor: boolean;
    vendorCategory: string;
  }>
) {
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };

  // Handle budget as string for decimal
  if (data.budget !== undefined) {
    updateData.budget = data.budget.toString();
  }

  const [updated] = await db
    .update(contacts)
    .set(updateData)
    .where(
      and(
        eq(contacts.id, contactId),
        eq(contacts.organizationId, session.organizationId)
      )
    )
    .returning();

  // Sync common fields to linked vendor if exists
  if (updated?.vendorId) {
    const vendorUpdates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name) vendorUpdates.name = data.name;
    if (data.email) vendorUpdates.email = data.email;
    if (data.phone) vendorUpdates.phone = data.phone;
    if (data.website) vendorUpdates.website = data.website;
    if (data.address) vendorUpdates.address = data.address;
    if (data.notes) vendorUpdates.notes = data.notes;

    if (Object.keys(vendorUpdates).length > 1) {
      await db.update(vendors)
        .set(vendorUpdates)
        .where(eq(vendors.id, updated.vendorId));
    }
  }

  return updated;
}

export async function deleteContact(session: TenantSession, contactId: number) {
  // Soft delete
  await db
    .update(contacts)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(contacts.id, contactId),
        eq(contacts.organizationId, session.organizationId)
      )
    );
}

// ============================================
// CONTACT DOCUMENTS
// ============================================

export async function getContactDocuments(contactId: number) {
  return db
    .select()
    .from(contactDocuments)
    .where(eq(contactDocuments.contactId, contactId))
    .orderBy(desc(contactDocuments.uploadedAt));
}

export async function addContactDocument(
  contactId: number,
  data: {
    name: string;
    url: string;
    type?: string;
    size?: number;
    mimeType?: string;
    uploadedBy?: string;
  }
) {
  const [doc] = await db
    .insert(contactDocuments)
    .values({
      contactId,
      name: data.name,
      url: data.url,
      type: data.type || "document",
      size: data.size,
      mimeType: data.mimeType,
      uploadedBy: data.uploadedBy,
    })
    .returning();

  return doc;
}

export async function deleteContactDocument(documentId: number) {
  await db.delete(contactDocuments).where(eq(contactDocuments.id, documentId));
}

// ============================================
// CONTACT PHOTOS
// ============================================

export async function getContactPhotos(contactId: number) {
  return db
    .select()
    .from(contactPhotos)
    .where(eq(contactPhotos.contactId, contactId))
    .orderBy(contactPhotos.sortOrder);
}

export async function addContactPhoto(
  contactId: number,
  data: {
    url: string;
    thumbnail?: string;
    caption?: string;
    sortOrder?: number;
    uploadedBy?: string;
  }
) {
  const [photo] = await db
    .insert(contactPhotos)
    .values({
      contactId,
      url: data.url,
      thumbnail: data.thumbnail,
      caption: data.caption,
      sortOrder: data.sortOrder || 0,
      uploadedBy: data.uploadedBy,
    })
    .returning();

  return photo;
}

export async function deleteContactPhoto(photoId: number) {
  await db.delete(contactPhotos).where(eq(contactPhotos.id, photoId));
}

// ============================================
// CONTACT ACTIVITIES
// ============================================

export async function getContactActivities(contactId: number, limit = 50) {
  return db
    .select({
      id: contactActivities.id,
      type: contactActivities.type,
      title: contactActivities.title,
      description: contactActivities.description,
      metadata: contactActivities.metadata,
      createdAt: contactActivities.createdAt,
      createdByName: users.name,
    })
    .from(contactActivities)
    .leftJoin(users, eq(contactActivities.createdBy, users.id))
    .where(eq(contactActivities.contactId, contactId))
    .orderBy(desc(contactActivities.createdAt))
    .limit(limit);
}

export async function createContactActivity(
  contactId: number,
  data: {
    type: "note" | "call" | "email" | "meeting" | "task_created" | "event_linked" | "lead_converted" | "status_change" | "other";
    title: string;
    description?: string;
    metadata?: Record<string, unknown>;
    createdBy?: string;
  }
) {
  const [activity] = await db
    .insert(contactActivities)
    .values({
      contactId,
      type: data.type,
      title: data.title,
      description: data.description,
      metadata: data.metadata,
      createdBy: data.createdBy,
    })
    .returning();

  return activity;
}

// ============================================
// CONTACT TAGS
// ============================================

export async function getContactTags(organizationId: number) {
  return db
    .select()
    .from(contactTags)
    .where(eq(contactTags.organizationId, organizationId))
    .orderBy(contactTags.name);
}

export async function createContactTag(
  organizationId: number,
  data: {
    name: string;
    color?: string;
    description?: string;
  }
) {
  const [tag] = await db
    .insert(contactTags)
    .values({
      organizationId,
      name: data.name,
      color: data.color || "#6366f1",
      description: data.description,
    })
    .returning();

  return tag;
}

export async function deleteContactTag(tagId: number) {
  await db.delete(contactTags).where(eq(contactTags.id, tagId));
}

// ============================================
// CONTACT LINKS (Events & Tasks)
// ============================================

export async function linkContactToEvent(
  contactId: number,
  eventId: number,
  role?: string
) {
  const [link] = await db
    .insert(contactEvents)
    .values({ contactId, eventId, role })
    .onConflictDoNothing()
    .returning();

  return link;
}

export async function unlinkContactFromEvent(contactId: number, eventId: number) {
  await db
    .delete(contactEvents)
    .where(
      and(
        eq(contactEvents.contactId, contactId),
        eq(contactEvents.eventId, eventId)
      )
    );
}

export async function linkContactToTask(
  contactId: number,
  taskId: number,
  role?: string
) {
  const [link] = await db
    .insert(contactTasks)
    .values({ contactId, taskId, role })
    .onConflictDoNothing()
    .returning();

  return link;
}

export async function unlinkContactFromTask(contactId: number, taskId: number) {
  await db
    .delete(contactTasks)
    .where(
      and(eq(contactTasks.contactId, contactId), eq(contactTasks.taskId, taskId))
    );
}

// ============================================
// DUPLICATE DETECTION
// ============================================

export async function findDuplicateContacts(
  session: TenantSession,
  email?: string,
  phone?: string
) {
  if (!email && !phone) return [];

  let whereClause = and(
    eq(contacts.organizationId, session.organizationId),
    isNull(contacts.deletedAt)
  );

  const conditions = [];
  if (email) {
    conditions.push(eq(contacts.email, email));
  }
  if (phone) {
    conditions.push(eq(contacts.phone, phone));
  }

  if (conditions.length > 0) {
    whereClause = and(whereClause, or(...conditions));
  }

  return db
    .select({
      id: contacts.id,
      name: contacts.name,
      email: contacts.email,
      phone: contacts.phone,
      type: contacts.type,
    })
    .from(contacts)
    .where(whereClause)
    .limit(10);
}

// ============================================
// CONVERT LEAD TO CONTACT
// ============================================

export async function convertLeadToContact(
  session: TenantSession,
  leadId: number
) {
  const lead = await db.query.leads.findFirst({
    where: (l, { eq, and }) =>
      and(eq(l.id, leadId), eq(l.organizationId, session.organizationId)),
  });

  if (!lead) return null;

  // Create contact from lead
  const [contact] = await db
    .insert(contacts)
    .values({
      organizationId: session.organizationId,
      type: "person",
      name: lead.title,
      leadId: lead.id,
      isLead: true,
      source: (lead.source as any) || "manual",
      createdBy: session.user.userId,
    })
    .returning();

  // Log activity
  await createContactActivity(contact.id, {
    type: "lead_converted",
    title: "Lead convertido a contacto",
    metadata: { leadId: lead.id, leadTitle: lead.title },
    createdBy: session.user.userId,
  });

  return contact;
}
