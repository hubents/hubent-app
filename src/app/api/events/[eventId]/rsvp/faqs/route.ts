import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rsvpFaqs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

type RouteParams = { params: Promise<{ eventId: string }> };

// POST /api/events/[eventId]/rsvp/faqs - Add FAQ
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const body = await request.json();

    const { question, answer, orderIndex } = body;

    if (!question || !answer) {
      return NextResponse.json({ success: false, error: "Question and answer are required" }, { status: 400 });
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

    return NextResponse.json({ success: true, data: newItem[0] });
  } catch (error) {
    console.error("Error creating FAQ:", error);
    return NextResponse.json({ success: false, error: "Failed to create FAQ" }, { status: 500 });
  }
}

// PUT /api/events/[eventId]/rsvp/faqs - Update FAQ
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const body = await request.json();

    const { id, question, answer, orderIndex } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    await db
      .update(rsvpFaqs)
      .set({
        question,
        answer,
        orderIndex: orderIndex ?? 0,
      })
      .where(and(eq(rsvpFaqs.id, id), eq(rsvpFaqs.eventId, eventIdNum)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating FAQ:", error);
    return NextResponse.json({ success: false, error: "Failed to update FAQ" }, { status: 500 });
  }
}

// DELETE /api/events/[eventId]/rsvp/faqs - Delete FAQ
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    await db
      .delete(rsvpFaqs)
      .where(and(eq(rsvpFaqs.id, parseInt(id)), eq(rsvpFaqs.eventId, eventIdNum)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    return NextResponse.json({ success: false, error: "Failed to delete FAQ" }, { status: 500 });
  }
}
