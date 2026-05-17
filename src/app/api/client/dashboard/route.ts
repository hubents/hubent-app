import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import {
  events,
  tasks,
  eventScheduleItems,
  guests,
  rsvpResponses,
  orgDocuments,
  financialDocuments,
} from "@/db/schema";
import { eq, and, gte, asc, desc, sql } from "drizzle-orm";
import { getUserEventAccess } from "@/lib/event-permissions";
import { apiHandler, ok, notFound } from "@/lib/api-handler";

export async function GET(_request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const userId = session.user.userId;
    const orgId = session.organizationId;

    // Get events this user has access to (scoped by role)
    const access = await getUserEventAccess(userId);
    if (!access.length) return notFound("No tienes eventos asignados");

    const eventIds = access.map((a) => a.eventId);

    // Get the first/primary event
    const event = await db.query.events.findFirst({
      where: (e, { inArray, eq, and }) =>
        and(inArray(e.id, eventIds), eq(e.organizationId, orgId)),
      orderBy: (e, { asc }) => [asc(e.date)],
    });

    if (!event) return notFound("Evento no encontrado");

    const eventId = event.id;

    // RSVP stats
    const [rsvpStats] = await db
      .select({
        total: sql<number>`count(*)`,
        confirmed: sql<number>`count(*) filter (where ${rsvpResponses.status} = 'confirmed')`,
        declined: sql<number>`count(*) filter (where ${rsvpResponses.status} = 'declined')`,
        pending: sql<number>`count(*) filter (where ${rsvpResponses.status} = 'pending' or ${rsvpResponses.status} is null)`,
      })
      .from(guests)
      .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
      .where(eq(guests.eventId, eventId));

    // Tasks/checklist (pending + in_progress, max 8)
    const checklist = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        dueDate: tasks.dueDate,
        priority: tasks.priority,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.eventId, eventId),
          eq(tasks.organizationId, orgId),
        )
      )
      .orderBy(asc(tasks.dueDate))
      .limit(8);

    // Upcoming schedule items (next 3)
    const now = new Date();
    const meetings = await db
      .select({
        id: eventScheduleItems.id,
        title: eventScheduleItems.title,
        date: eventScheduleItems.date,
        startTime: eventScheduleItems.startTime,
        location: eventScheduleItems.location,
      })
      .from(eventScheduleItems)
      .where(
        and(
          eq(eventScheduleItems.eventId, eventId),
          gte(eventScheduleItems.date, now),
        )
      )
      .orderBy(asc(eventScheduleItems.date))
      .limit(3);

    // Recent shared documents (max 5)
    const documents = await db
      .select({
        id: orgDocuments.id,
        name: orgDocuments.name,
        fileType: orgDocuments.fileType,
        storageUrl: orgDocuments.storageUrl,
        createdAt: orgDocuments.createdAt,
      })
      .from(orgDocuments)
      .where(
        and(
          eq(orgDocuments.organizationId, orgId),
          eq(orgDocuments.eventId, eventId),
        )
      )
      .orderBy(desc(orgDocuments.createdAt))
      .limit(5);

    // Budget spent — sum of paid invoices for this event
    const [budgetRow] = await db
      .select({
        spent: sql<number>`coalesce(sum(${financialDocuments.paidAmount}), 0)`,
      })
      .from(financialDocuments)
      .where(
        and(
          eq(financialDocuments.organizationId, orgId),
          eq(financialDocuments.eventId, eventId),
          sql`${financialDocuments.direction} = 'outgoing'`,
        )
      );

    const budget = event.budget ? Number(event.budget) : null;
    const spent = Number(budgetRow?.spent ?? 0);

    // Days left
    const daysLeft = event.date
      ? Math.max(0, Math.ceil((new Date(event.date).getTime() - Date.now()) / 86400000))
      : null;

    // Progress from tasks: % done
    const totalTasks = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(eq(tasks.eventId, eventId), eq(tasks.organizationId, orgId)));
    const doneTasks = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(
        and(
          eq(tasks.eventId, eventId),
          eq(tasks.organizationId, orgId),
          eq(tasks.status, "completed"),
        )
      );
    const total = Number(totalTasks[0]?.count ?? 0);
    const done = Number(doneTasks[0]?.count ?? 0);
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    return ok({
      event: {
        id: event.id,
        name: event.name,
        type: event.type,
        customType: event.customType,
        date: event.date,
        endDate: event.endDate,
        location: event.location,
        coverImage: event.coverImage,
      },
      daysLeft,
      progress,
      budget: { total: budget, spent },
      rsvp: {
        total: Number(rsvpStats?.total ?? 0),
        confirmed: Number(rsvpStats?.confirmed ?? 0),
        declined: Number(rsvpStats?.declined ?? 0),
        pending: Number(rsvpStats?.pending ?? 0),
      },
      checklist,
      meetings,
      documents,
    });
  }, "GET /api/client/dashboard");
}
