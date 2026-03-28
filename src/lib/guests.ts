import { db } from "@/db";
import { 
  guests,
  guestGroups,
  rsvpResponses,
  rsvpLandingPages,
  events,
  guestCompanions,
  rsvpTransportBookings,
  rsvpTransportOptions,
  eventTables,
  guestCheckins
} from "@/db/schema";
import { eq, and, or, desc, sql, isNull } from "drizzle-orm";
import type { TenantSession, PaginationParams } from "@/types";

// ============================================
// GUEST GROUPS
// ============================================

export async function getGuestGroups(eventId: number) {
  return db.query.guestGroups.findMany({
    where: (g, { eq }) => eq(g.eventId, eventId),
    orderBy: (g, { asc }) => [asc(g.tableNumber), asc(g.name)],
  });
}

export async function createGuestGroup(
  eventId: number,
  data: {
    name: string;
    tableNumber?: number;
    notes?: string;
  }
) {
  const [group] = await db.insert(guestGroups).values({
    eventId,
    name: data.name,
    tableNumber: data.tableNumber,
    notes: data.notes,
  }).returning();

  return group;
}

export async function updateGuestGroup(
  groupId: number,
  data: Partial<{
    name: string;
    tableNumber: number;
    notes: string;
  }>
) {
  const [updated] = await db.update(guestGroups)
    .set(data)
    .where(eq(guestGroups.id, groupId))
    .returning();

  return updated;
}

export async function deleteGuestGroup(groupId: number) {
  // Move guests to no group
  await db.update(guests)
    .set({ groupId: null })
    .where(eq(guests.groupId, groupId));

  await db.delete(guestGroups)
    .where(eq(guestGroups.id, groupId));
}

// ============================================
// GUESTS
// ============================================

export async function getGuests(
  eventId: number,
  params: PaginationParams & { groupId?: number; rsvpStatus?: string } = {}
) {
  const { page = 1, limit = 100, groupId, rsvpStatus } = params;
  const offset = (page - 1) * limit;

  let whereClause = eq(guests.eventId, eventId);

  if (groupId) {
    whereClause = and(whereClause, eq(guests.groupId, groupId))!;
  }

  const baseQuery = db
    .select({
      id: guests.id,
      firstName: guests.firstName,
      lastName: guests.lastName,
      email: guests.email,
      phone: guests.phone,
      groupId: guests.groupId,
      tableId: guests.tableId,
      ageGroup: guests.ageGroup,
      menuPreference: guests.menuPreference,
      plusOne: guests.plusOne,
      plusOneName: guests.plusOneName,
      dietaryRestrictions: guests.dietaryRestrictions,
      notes: guests.notes,
      createdAt: guests.createdAt,
      rsvpStatus: rsvpResponses.status,
      rsvpRespondedAt: rsvpResponses.respondedAt,
      plusOneConfirmed: rsvpResponses.plusOneConfirmed,
      groupName: guestGroups.name,
      tableNumber: guestGroups.tableNumber,
      tableName: eventTables.name,
      tableCapacity: eventTables.capacity,
    })
    .from(guests)
    .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
    .leftJoin(guestGroups, eq(guests.groupId, guestGroups.id))
    .leftJoin(eventTables, eq(guests.tableId, eventTables.id));

  if (rsvpStatus) {
    if (rsvpStatus === "pending") {
      whereClause = and(whereClause, or(eq(rsvpResponses.status, "pending"), isNull(rsvpResponses.status)))!;
    } else {
      whereClause = and(whereClause, eq(rsvpResponses.status, rsvpStatus as "confirmed" | "declined" | "maybe"))!;
    }
  }

  const filteredGuests = await baseQuery
    .where(whereClause)
    .orderBy(guests.lastName, guests.firstName)
    .limit(limit)
    .offset(offset);

  // Get companions for each guest
  const guestsWithCompanions = await Promise.all(
    filteredGuests.map(async (guest) => {
      const companions = await db
        .select({
          id: guestCompanions.id,
          fullName: guestCompanions.fullName,
          menuPreference: guestCompanions.menuPreference,
          dietaryRestrictions: guestCompanions.dietaryRestrictions,
        })
        .from(guestCompanions)
        .where(eq(guestCompanions.guestId, guest.id));

      // Get transport booking if any
      const transportBooking = await db
        .select({
          transportName: rsvpTransportOptions.name,
          seats: rsvpTransportBookings.seats,
        })
        .from(rsvpTransportBookings)
        .leftJoin(rsvpTransportOptions, eq(rsvpTransportBookings.transportOptionId, rsvpTransportOptions.id))
        .where(eq(rsvpTransportBookings.guestId, guest.id))
        .limit(1);

      return {
        ...guest,
        companions,
        companionCount: companions.length,
        transport: transportBooking[0] || null,
      };
    })
  );

  // Get stats
  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
      confirmed: sql<number>`count(*) filter (where ${rsvpResponses.status} = 'confirmed')`,
      declined: sql<number>`count(*) filter (where ${rsvpResponses.status} = 'declined')`,
      pending: sql<number>`count(*) filter (where ${rsvpResponses.status} = 'pending' or ${rsvpResponses.status} is null)`,
      plusOnes: sql<number>`count(*) filter (where ${guests.plusOne} = true)`,
      plusOnesConfirmed: sql<number>`count(*) filter (where ${rsvpResponses.plusOneConfirmed} = true)`,
      adults: sql<number>`count(*) filter (where ${guests.ageGroup} = 'adult' or ${guests.ageGroup} is null)`,
      children: sql<number>`count(*) filter (where ${guests.ageGroup} = 'child')`,
      babies: sql<number>`count(*) filter (where ${guests.ageGroup} = 'baby')`,
      seated: sql<number>`count(*) filter (where ${guests.tableId} is not null)`,
    })
    .from(guests)
    .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
    .where(eq(guests.eventId, eventId));

  // Get companion count
  const companionStats = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(guestCompanions)
    .innerJoin(guests, eq(guestCompanions.guestId, guests.id))
    .where(eq(guests.eventId, eventId));

  const totalCompanions = Number(companionStats[0]?.count || 0);

  // When filtering by rsvpStatus, meta.total must reflect the filtered count
  let filteredTotal = Number(stats.total);
  if (rsvpStatus) {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(guests)
      .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
      .where(whereClause);
    filteredTotal = Number(countResult?.count || 0);
  }

  return {
    data: guestsWithCompanions,
    stats: {
      total: Number(stats.total),
      confirmed: Number(stats.confirmed),
      declined: Number(stats.declined),
      pending: Number(stats.pending),
      plusOnes: Number(stats.plusOnes),
      plusOnesConfirmed: Number(stats.plusOnesConfirmed),
      adults: Number(stats.adults),
      children: Number(stats.children),
      babies: Number(stats.babies),
      seated: Number(stats.seated),
      totalCompanions,
      totalAttending: Number(stats.confirmed) + totalCompanions,
    },
    meta: {
      page,
      limit,
      total: filteredTotal,
      totalPages: Math.ceil(filteredTotal / limit),
    },
  };
}

export async function getGuest(guestId: number) {
  const guest = await db.query.guests.findFirst({
    where: (g, { eq }) => eq(g.id, guestId),
  });

  if (!guest) return null;

  const rsvp = await db.query.rsvpResponses.findFirst({
    where: (r, { eq }) => eq(r.guestId, guestId),
  });

  const group = guest.groupId
    ? await db.query.guestGroups.findFirst({ where: (g, { eq }) => eq(g.id, guest.groupId!) })
    : null;

  return {
    ...guest,
    rsvp,
    group,
  };
}

export async function createGuest(
  eventId: number,
  data: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    groupId?: number;
    menuPreference?: string;
    ageGroup?: string;
    plusOne?: boolean;
    plusOneName?: string;
    dietaryRestrictions?: string;
    notes?: string;
    invitedBy?: string;
  }
) {
  const [guest] = await db.insert(guests).values({
    eventId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    groupId: data.groupId,
    menuPreference: data.menuPreference || null,
    ageGroup: data.ageGroup || "adult",
    plusOne: data.plusOne || false,
    plusOneName: data.plusOneName,
    dietaryRestrictions: data.dietaryRestrictions,
    notes: data.notes,
    invitedBy: data.invitedBy,
  }).returning();

  // Create pending RSVP
  await db.insert(rsvpResponses).values({
    guestId: guest.id,
    status: "pending",
  });

  return guest;
}

export async function updateGuest(
  guestId: number,
  data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    groupId: number | null;
    tableId: number | null;
    menuPreference: string | null;
    ageGroup: string;
    plusOne: boolean;
    plusOneName: string;
    dietaryRestrictions: string;
    notes: string;
  }>
) {
  const [updated] = await db.update(guests)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(guests.id, guestId))
    .returning();

  return updated;
}

export async function updateGuestRsvpStatus(
  guestId: number,
  status: "confirmed" | "pending" | "declined" | "maybe"
) {
  const existing = await db
    .select({ id: rsvpResponses.id })
    .from(rsvpResponses)
    .where(eq(rsvpResponses.guestId, guestId))
    .limit(1);

  let result;
  if (existing.length === 0) {
    const [created] = await db.insert(rsvpResponses).values({
      guestId,
      status,
      respondedAt: new Date(),
    }).returning();
    result = created;
  } else {
    const [updated] = await db.update(rsvpResponses)
      .set({ status, respondedAt: new Date() })
      .where(eq(rsvpResponses.guestId, guestId))
      .returning();
    result = updated;
  }

  if (status === "declined") {
    await db.update(guests)
      .set({ tableId: null, updatedAt: new Date() })
      .where(eq(guests.id, guestId));
  }

  return result;
}

export async function deleteGuest(guestId: number) {
  await db.delete(guests)
    .where(eq(guests.id, guestId));
}

export async function bulkCreateGuests(
  eventId: number,
  guestList: Array<{
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    groupId?: number;
    plusOne?: boolean;
  }>
) {
  const created = [];

  for (const guestData of guestList) {
    const guest = await createGuest(eventId, guestData);
    created.push(guest);
  }

  return created;
}

// ============================================
// RSVP
// ============================================

export async function submitRsvp(
  guestId: number,
  data: {
    status: "confirmed" | "declined" | "maybe";
    plusOneConfirmed?: boolean;
    message?: string;
  }
) {
  const [updated] = await db.update(rsvpResponses)
    .set({
      status: data.status,
      plusOneConfirmed: data.plusOneConfirmed || false,
      message: data.message,
      respondedAt: new Date(),
    })
    .where(eq(rsvpResponses.guestId, guestId))
    .returning();

  if (data.status === "declined") {
    await db.update(guests)
      .set({ tableId: null, updatedAt: new Date() })
      .where(eq(guests.id, guestId));
  }

  return updated;
}

export async function getRsvpStats(eventId: number) {
  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
      confirmed: sql<number>`count(*) filter (where ${rsvpResponses.status} = 'confirmed')`,
      declined: sql<number>`count(*) filter (where ${rsvpResponses.status} = 'declined')`,
      maybe: sql<number>`count(*) filter (where ${rsvpResponses.status} = 'maybe')`,
      pending: sql<number>`count(*) filter (where ${rsvpResponses.status} = 'pending' or ${rsvpResponses.status} is null)`,
    })
    .from(guests)
    .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
    .where(eq(guests.eventId, eventId));

  return {
    total: Number(stats.total),
    confirmed: Number(stats.confirmed),
    declined: Number(stats.declined),
    maybe: Number(stats.maybe),
    pending: Number(stats.pending),
    responseRate: stats.total > 0 
      ? Math.round(((Number(stats.confirmed) + Number(stats.declined) + Number(stats.maybe)) / Number(stats.total)) * 100)
      : 0,
  };
}

// ============================================
// RSVP LANDING PAGES
// ============================================

export async function getRsvpLandingPage(eventId: number) {
  return db.query.rsvpLandingPages.findFirst({
    where: (p, { eq }) => eq(p.eventId, eventId),
  });
}

export async function getRsvpLandingPageBySlug(slug: string) {
  const page = await db.query.rsvpLandingPages.findFirst({
    where: (p, { eq, and }) => 
      and(
        eq(p.slug, slug),
        eq(p.isActive, true)
      ),
  });

  if (!page) return null;

  // Get event info
  const event = await db.query.events.findFirst({
    where: (e, { eq }) => eq(e.id, page.eventId),
  });

  return {
    ...page,
    event,
  };
}

export async function createRsvpLandingPage(
  eventId: number,
  data: {
    slug: string;
    title?: string;
    description?: string;
    heroImage?: string;
    customCss?: string;
  }
) {
  const [page] = await db.insert(rsvpLandingPages).values({
    eventId,
    slug: data.slug,
    title: data.title,
    description: data.description,
    heroImage: data.heroImage,
    customCss: data.customCss,
    isActive: true,
  }).returning();

  return page;
}

export async function updateRsvpLandingPage(
  pageId: number,
  data: Partial<{
    slug: string;
    title: string;
    description: string;
    heroImage: string;
    customCss: string;
    isActive: boolean;
  }>
) {
  const [updated] = await db.update(rsvpLandingPages)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(rsvpLandingPages.id, pageId))
    .returning();

  return updated;
}

// ============================================
// EVENT TABLES (Floor Plan)
// ============================================

export async function getEventTables(eventId: number) {
  const tables = await db
    .select()
    .from(eventTables)
    .where(eq(eventTables.eventId, eventId))
    .orderBy(eventTables.name);

  const tablesWithGuests = await Promise.all(
    tables.map(async (table) => {
      const guestCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(guests)
        .where(eq(guests.tableId, table.id));

      const tableGuests = await db
        .select({
          id: guests.id,
          firstName: guests.firstName,
          lastName: guests.lastName,
          ageGroup: guests.ageGroup,
          menuPreference: guests.menuPreference,
        })
        .from(guests)
        .where(eq(guests.tableId, table.id));

      return {
        ...table,
        guestCount: Number(guestCount[0]?.count || 0),
        guests: tableGuests,
      };
    })
  );

  return tablesWithGuests;
}

export async function createEventTable(
  eventId: number,
  data: {
    name: string;
    shape?: string;
    capacity?: number;
    positionX?: number;
    positionY?: number;
    width?: number;
    height?: number;
    color?: string;
  }
) {
  const [table] = await db.insert(eventTables).values({
    eventId,
    name: data.name,
    shape: data.shape || "round",
    capacity: data.capacity || 8,
    positionX: data.positionX || 100,
    positionY: data.positionY || 100,
    width: data.width || 120,
    height: data.height || 120,
    color: data.color || "#ffffff",
  }).returning();

  return table;
}

export async function updateEventTable(
  tableId: number,
  data: Partial<{
    name: string;
    shape: string;
    capacity: number;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    rotation: number;
    color: string;
  }>
) {
  const [updated] = await db.update(eventTables)
    .set(data)
    .where(eq(eventTables.id, tableId))
    .returning();

  return updated;
}

export async function deleteEventTable(tableId: number) {
  await db.update(guests)
    .set({ tableId: null })
    .where(eq(guests.tableId, tableId));

  await db.delete(eventTables)
    .where(eq(eventTables.id, tableId));
}

export async function assignGuestToTable(guestId: number, tableId: number | null) {
  const [updated] = await db.update(guests)
    .set({ tableId, updatedAt: new Date() })
    .where(eq(guests.id, guestId))
    .returning();

  return updated;
}

// ============================================
// GUEST CHECK-IN
// ============================================

export async function checkInGuest(guestId: number, checkedInBy?: string, notes?: string) {
  const [checkin] = await db.insert(guestCheckins).values({
    guestId,
    checkedInBy,
    notes,
  }).returning();

  return checkin;
}

export async function getCheckedInGuests(eventId: number) {
  const checkins = await db
    .select({
      guestId: guestCheckins.guestId,
      checkedInAt: guestCheckins.checkedInAt,
      firstName: guests.firstName,
      lastName: guests.lastName,
    })
    .from(guestCheckins)
    .innerJoin(guests, eq(guestCheckins.guestId, guests.id))
    .where(eq(guests.eventId, eventId))
    .orderBy(desc(guestCheckins.checkedInAt));

  return checkins;
}
