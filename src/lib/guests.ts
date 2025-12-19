import { db } from "@/db";
import { 
  guests,
  guestGroups,
  rsvpResponses,
  rsvpLandingPages,
  events
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
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

  const guestList = await db
    .select({
      id: guests.id,
      firstName: guests.firstName,
      lastName: guests.lastName,
      email: guests.email,
      phone: guests.phone,
      groupId: guests.groupId,
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
    })
    .from(guests)
    .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
    .leftJoin(guestGroups, eq(guests.groupId, guestGroups.id))
    .where(whereClause)
    .orderBy(guests.lastName, guests.firstName)
    .limit(limit)
    .offset(offset);

  // Filter by RSVP status if provided
  const filteredGuests = rsvpStatus
    ? guestList.filter(g => g.rsvpStatus === rsvpStatus)
    : guestList;

  // Get stats
  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
      confirmed: sql<number>`count(*) filter (where ${rsvpResponses.status} = 'confirmed')`,
      declined: sql<number>`count(*) filter (where ${rsvpResponses.status} = 'declined')`,
      pending: sql<number>`count(*) filter (where ${rsvpResponses.status} = 'pending' or ${rsvpResponses.status} is null)`,
      plusOnes: sql<number>`count(*) filter (where ${guests.plusOne} = true)`,
      plusOnesConfirmed: sql<number>`count(*) filter (where ${rsvpResponses.plusOneConfirmed} = true)`,
    })
    .from(guests)
    .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
    .where(eq(guests.eventId, eventId));

  return {
    data: filteredGuests,
    stats: {
      total: Number(stats.total),
      confirmed: Number(stats.confirmed),
      declined: Number(stats.declined),
      pending: Number(stats.pending),
      plusOnes: Number(stats.plusOnes),
      plusOnesConfirmed: Number(stats.plusOnesConfirmed),
      totalAttending: Number(stats.confirmed) + Number(stats.plusOnesConfirmed),
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
    groupId: number;
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
