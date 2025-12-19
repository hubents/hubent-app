import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getPerson, updatePerson, deletePerson } from "@/lib/crm";

type RouteParams = { params: Promise<{ personId: string }> };

// GET /api/crm/people/[personId] - Get single person
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("viewer");
    const { personId } = await params;

    const person = await getPerson(session, parseInt(personId, 10));

    if (!person) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Person not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: person,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch person";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// PATCH /api/crm/people/[personId] - Update person
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { personId } = await params;
    const body = await request.json();

    const updated = await updatePerson(session, parseInt(personId, 10), body);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Person not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update person";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/crm/people/[personId] - Delete person
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { personId } = await params;

    await deletePerson(session, parseInt(personId, 10));

    return NextResponse.json({
      success: true,
      data: { message: "Person deleted" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete person";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
