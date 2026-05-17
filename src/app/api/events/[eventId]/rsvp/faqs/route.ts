import { NextRequest } from "next/server";
import { db } from "@/db";
import { rsvpFaqs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireEventSectionAccess } from "@/lib/session";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string }> };

// POST /api/events/[eventId]/rsvp/faqs - Add FAQ
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "rsvp", "edit");
    const body = await request.json();

    const { question, answer, orderIndex } = body;

    if (!question || !answer) {
      return badRequest("Question and answer are required");
    }

    const newItem = await db
      .insert(rsvpFaqs)
      .values({
        eventId: eventIdNum,
        question,
        answer,
        orderIndex: orderIndex || 0,
      })
      .returning();

    return ok(newItem[0]);
  }, "POST /api/events/[eventId]/rsvp/faqs");
}

// PUT /api/events/[eventId]/rsvp/faqs - Update FAQ
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "rsvp", "edit");
    const body = await request.json();

    const { id, question, answer, orderIndex } = body;

    if (!id) {
      return badRequest("ID is required");
    }

    await db
      .update(rsvpFaqs)
      .set({
        question,
        answer,
        orderIndex: orderIndex ?? 0,
      })
      .where(and(eq(rsvpFaqs.id, id), eq(rsvpFaqs.eventId, eventIdNum)));

    return ok({ success: true });
  }, "PUT /api/events/[eventId]/rsvp/faqs");
}

// DELETE /api/events/[eventId]/rsvp/faqs - Delete FAQ
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "rsvp", "edit");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return badRequest("ID is required");
    }

    await db
      .delete(rsvpFaqs)
      .where(and(eq(rsvpFaqs.id, parseInt(id)), eq(rsvpFaqs.eventId, eventIdNum)));

    return ok({ success: true });
  }, "DELETE /api/events/[eventId]/rsvp/faqs");
}
