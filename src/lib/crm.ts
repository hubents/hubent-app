import { db } from "@/db";
import { 
  leads, 
  leadStages, 
  companies, 
  people, 
  peopleCompanies,
  users,
  contacts
} from "@/db/schema";
import { eq, and, desc, isNull, ilike, or, sql } from "drizzle-orm";
import type { TenantSession, PaginationParams, FilterParams } from "@/types";

// ============================================
// LEAD STAGES
// ============================================

export async function getLeadStages(organizationId: number) {
  return db.query.leadStages.findMany({
    where: (s, { eq }) => eq(s.organizationId, organizationId),
    orderBy: (s, { asc }) => [asc(s.sortOrder)],
  });
}

export async function createLeadStage(
  session: TenantSession,
  data: {
    name: string;
    color?: string;
    sortOrder?: number;
    isDefault?: boolean;
    isWon?: boolean;
    isLost?: boolean;
  }
) {
  const [stage] = await db.insert(leadStages).values({
    organizationId: session.organizationId,
    name: data.name,
    color: data.color || "#6366f1",
    sortOrder: data.sortOrder || 0,
    isDefault: data.isDefault || false,
    isWon: data.isWon || false,
    isLost: data.isLost || false,
  }).returning();

  return stage;
}

export async function updateLeadStage(
  session: TenantSession,
  stageId: number,
  data: Partial<{
    name: string;
    color: string;
    sortOrder: number;
    isDefault: boolean;
    isWon: boolean;
    isLost: boolean;
  }>
) {
  const [updated] = await db.update(leadStages)
    .set(data)
    .where(
      and(
        eq(leadStages.id, stageId),
        eq(leadStages.organizationId, session.organizationId)
      )
    )
    .returning();

  return updated;
}

export async function deleteLeadStage(session: TenantSession, stageId: number) {
  await db.delete(leadStages)
    .where(
      and(
        eq(leadStages.id, stageId),
        eq(leadStages.organizationId, session.organizationId)
      )
    );
}

// ============================================
// LEADS
// ============================================

export async function getLeads(
  session: TenantSession,
  params: PaginationParams & FilterParams = {}
) {
  const { page = 1, limit = 50, search, status } = params;
  const offset = (page - 1) * limit;

  let whereClause = and(
    eq(leads.organizationId, session.organizationId),
    isNull(leads.deletedAt)
  );

  if (search) {
    whereClause = and(
      whereClause,
      ilike(leads.title, `%${search}%`)
    );
  }

  if (status) {
    whereClause = and(
      whereClause,
      eq(leads.status, status as any)
    );
  }

  const results = await db
    .select({
      id: leads.id,
      title: leads.title,
      description: leads.description,
      value: leads.value,
      currency: leads.currency,
      stageId: leads.stageId,
      status: leads.status,
      probability: leads.probability,
      expectedCloseDate: leads.expectedCloseDate,
      source: leads.source,
      companyId: leads.companyId,
      personId: leads.personId,
      assignedTo: leads.assignedTo,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      assignedUserName: users.name,
      assignedUserImage: users.image,
    })
    .from(leads)
    .leftJoin(users, eq(leads.assignedTo, users.id))
    .where(whereClause)
    .orderBy(desc(leads.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
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

export async function getLeadsByStage(session: TenantSession) {
  const stages = await getLeadStages(session.organizationId);
  
  const leadsData = await db
    .select({
      id: leads.id,
      title: leads.title,
      value: leads.value,
      currency: leads.currency,
      stageId: leads.stageId,
      status: leads.status,
      probability: leads.probability,
      expectedCloseDate: leads.expectedCloseDate,
      assignedTo: leads.assignedTo,
      createdAt: leads.createdAt,
      contactId: leads.contactId,
      assignedUserName: users.name,
      assignedUserImage: users.image,
      contactName: contacts.name,
      contactEmail: contacts.email,
      contactPhone: contacts.phone,
      contactType: contacts.type,
      contactAvatar: contacts.avatar,
    })
    .from(leads)
    .leftJoin(users, eq(leads.assignedTo, users.id))
    .leftJoin(contacts, eq(leads.contactId, contacts.id))
    .where(
      and(
        eq(leads.organizationId, session.organizationId),
        isNull(leads.deletedAt)
      )
    )
    .orderBy(desc(leads.createdAt));

  // Group leads by stage
  const stagesWithLeads = stages.map(stage => ({
    ...stage,
    leads: leadsData.filter(lead => lead.stageId === stage.id),
    totalValue: leadsData
      .filter(lead => lead.stageId === stage.id)
      .reduce((sum, lead) => sum + (Number(lead.value) || 0), 0),
  }));

  return stagesWithLeads;
}

export async function getLead(session: TenantSession, leadId: number) {
  const lead = await db.query.leads.findFirst({
    where: (l, { eq, and }) => 
      and(
        eq(l.id, leadId),
        eq(l.organizationId, session.organizationId),
        isNull(l.deletedAt)
      ),
  });

  if (!lead) return null;

  // Get contact info if contactId exists
  let contact = null;
  if (lead.contactId) {
    contact = await db.query.contacts.findFirst({
      where: (c, { eq }) => eq(c.id, lead.contactId!),
      columns: {
        id: true,
        type: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
      },
    });
  }

  return {
    ...lead,
    contact,
  };
}

export async function createLead(
  session: TenantSession,
  data: {
    title: string;
    description?: string;
    value?: number;
    currency?: string;
    stageId?: number;
    probability?: number;
    expectedCloseDate?: Date;
    source?: string;
    contactId: number;
    companyId?: number;
    personId?: number;
    assignedTo?: string;
  }
) {
  // Get default stage if not provided
  let stageId = data.stageId;
  if (!stageId) {
    const defaultStage = await db.query.leadStages.findFirst({
      where: (s, { eq, and }) => 
        and(
          eq(s.organizationId, session.organizationId),
          eq(s.isDefault, true)
        ),
    });
    stageId = defaultStage?.id;
  }

  const [lead] = await db.insert(leads).values({
    organizationId: session.organizationId,
    title: data.title,
    description: data.description,
    value: data.value?.toString(),
    currency: data.currency || "EUR",
    stageId,
    probability: data.probability || 50,
    expectedCloseDate: data.expectedCloseDate,
    source: data.source,
    contactId: data.contactId,
    companyId: data.companyId,
    personId: data.personId,
    assignedTo: data.assignedTo || session.user.userId,
    createdBy: session.user.userId,
  }).returning();

  return lead;
}

export async function updateLead(
  session: TenantSession,
  leadId: number,
  data: Partial<{
    title: string;
    description: string;
    value: number;
    currency: string;
    stageId: number;
    status: string;
    probability: number;
    expectedCloseDate: Date;
    source: string;
    companyId: number;
    personId: number;
    assignedTo: string;
    lostReason: string;
  }>
) {
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  
  // Handle value as string for decimal
  if (data.value !== undefined) {
    updateData.value = data.value.toString();
  }

  // If status is won or lost, set closedAt
  if (data.status === "won" || data.status === "lost") {
    updateData.closedAt = new Date();
  }

  const [updated] = await db.update(leads)
    .set(updateData)
    .where(
      and(
        eq(leads.id, leadId),
        eq(leads.organizationId, session.organizationId)
      )
    )
    .returning();

  return updated;
}

export async function moveLead(
  session: TenantSession,
  leadId: number,
  stageId: number
) {
  return updateLead(session, leadId, { stageId });
}

export async function deleteLead(session: TenantSession, leadId: number) {
  // Soft delete
  await db.update(leads)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(leads.id, leadId),
        eq(leads.organizationId, session.organizationId)
      )
    );
}

// ============================================
// COMPANIES
// ============================================

export async function getCompanies(
  session: TenantSession,
  params: PaginationParams & FilterParams = {}
) {
  const { page = 1, limit = 50, search } = params;
  const offset = (page - 1) * limit;

  let whereClause = and(
    eq(companies.organizationId, session.organizationId),
    isNull(companies.deletedAt)
  );

  if (search) {
    whereClause = and(
      whereClause,
      or(
        ilike(companies.legalName, `%${search}%`),
        ilike(companies.tradeName, `%${search}%`),
        ilike(companies.taxId, `%${search}%`)
      )
    );
  }

  const results = await db
    .select()
    .from(companies)
    .where(whereClause)
    .orderBy(desc(companies.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(companies)
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

export async function getCompany(session: TenantSession, companyId: number) {
  return db.query.companies.findFirst({
    where: (c, { eq, and }) => 
      and(
        eq(c.id, companyId),
        eq(c.organizationId, session.organizationId),
        isNull(c.deletedAt)
      ),
  });
}

export async function createCompany(
  session: TenantSession,
  data: {
    legalName: string;
    tradeName?: string;
    taxId?: string;
    taxIdType?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo?: string;
    industry?: string;
    notes?: string;
  }
) {
  const [company] = await db.insert(companies).values({
    organizationId: session.organizationId,
    ...data,
    createdBy: session.user.userId,
  }).returning();

  return company;
}

export async function updateCompany(
  session: TenantSession,
  companyId: number,
  data: Partial<{
    legalName: string;
    tradeName: string;
    taxId: string;
    taxIdType: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
    email: string;
    website: string;
    logo: string;
    industry: string;
    notes: string;
    fiscalDataVerified: boolean;
    fiscalDataSource: string;
  }>
) {
  const [updated] = await db.update(companies)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(companies.id, companyId),
        eq(companies.organizationId, session.organizationId)
      )
    )
    .returning();

  return updated;
}

export async function deleteCompany(session: TenantSession, companyId: number) {
  await db.update(companies)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(companies.id, companyId),
        eq(companies.organizationId, session.organizationId)
      )
    );
}

// ============================================
// PEOPLE
// ============================================

export async function getPeople(
  session: TenantSession,
  params: PaginationParams & FilterParams = {}
) {
  const { page = 1, limit = 50, search } = params;
  const offset = (page - 1) * limit;

  let whereClause = and(
    eq(people.organizationId, session.organizationId),
    isNull(people.deletedAt)
  );

  if (search) {
    whereClause = and(
      whereClause,
      or(
        ilike(people.firstName, `%${search}%`),
        ilike(people.lastName, `%${search}%`),
        ilike(people.email, `%${search}%`)
      )
    );
  }

  const results = await db
    .select()
    .from(people)
    .where(whereClause)
    .orderBy(desc(people.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(people)
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

export async function getPerson(session: TenantSession, personId: number) {
  const person = await db.query.people.findFirst({
    where: (p, { eq, and }) => 
      and(
        eq(p.id, personId),
        eq(p.organizationId, session.organizationId),
        isNull(p.deletedAt)
      ),
  });

  if (!person) return null;

  // Get associated companies
  const personCompanies = await db
    .select({
      id: peopleCompanies.id,
      companyId: peopleCompanies.companyId,
      role: peopleCompanies.role,
      isPrimary: peopleCompanies.isPrimary,
      companyName: companies.legalName,
      companyLogo: companies.logo,
    })
    .from(peopleCompanies)
    .innerJoin(companies, eq(peopleCompanies.companyId, companies.id))
    .where(eq(peopleCompanies.personId, personId));

  return {
    ...person,
    companies: personCompanies,
  };
}

export async function createPerson(
  session: TenantSession,
  data: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    position?: string;
    department?: string;
    linkedinUrl?: string;
    avatar?: string;
    notes?: string;
    companyId?: number;
    companyRole?: string;
  }
) {
  const [person] = await db.insert(people).values({
    organizationId: session.organizationId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    mobile: data.mobile,
    position: data.position,
    department: data.department,
    linkedinUrl: data.linkedinUrl,
    avatar: data.avatar,
    notes: data.notes,
    createdBy: session.user.userId,
  }).returning();

  // Link to company if provided
  if (data.companyId) {
    await db.insert(peopleCompanies).values({
      personId: person.id,
      companyId: data.companyId,
      role: data.companyRole,
      isPrimary: true,
    });
  }

  return person;
}

export async function updatePerson(
  session: TenantSession,
  personId: number,
  data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    mobile: string;
    position: string;
    department: string;
    linkedinUrl: string;
    avatar: string;
    notes: string;
  }>
) {
  const [updated] = await db.update(people)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(people.id, personId),
        eq(people.organizationId, session.organizationId)
      )
    )
    .returning();

  return updated;
}

export async function deletePerson(session: TenantSession, personId: number) {
  await db.update(people)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(people.id, personId),
        eq(people.organizationId, session.organizationId)
      )
    );
}

// ============================================
// PEOPLE-COMPANIES RELATIONSHIP
// ============================================

export async function linkPersonToCompany(
  personId: number,
  companyId: number,
  role?: string,
  isPrimary: boolean = false
) {
  const [link] = await db.insert(peopleCompanies).values({
    personId,
    companyId,
    role,
    isPrimary,
  }).returning();

  return link;
}

export async function unlinkPersonFromCompany(
  personId: number,
  companyId: number
) {
  await db.delete(peopleCompanies)
    .where(
      and(
        eq(peopleCompanies.personId, personId),
        eq(peopleCompanies.companyId, companyId)
      )
    );
}

export async function getCompanyPeople(companyId: number) {
  return db
    .select({
      id: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      email: people.email,
      phone: people.phone,
      position: people.position,
      avatar: people.avatar,
      role: peopleCompanies.role,
      isPrimary: peopleCompanies.isPrimary,
    })
    .from(peopleCompanies)
    .innerJoin(people, eq(peopleCompanies.personId, people.id))
    .where(eq(peopleCompanies.companyId, companyId));
}
