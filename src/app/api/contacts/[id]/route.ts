import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getContact, updateContact, deleteContact } from "@/lib/contacts";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/contacts/[id] - Get single contact
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("viewer");
    const { id } = await params;

    const contact = await getContact(session, parseInt(id, 10));

    if (!contact) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Contact not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    console.error("GET /api/contacts/[id] error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch contact";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}

// PUT /api/contacts/[id] - Update contact
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { id } = await params;
    const body = await request.json();

    // Handle date conversion
    if (body.eventDate) {
      body.eventDate = new Date(body.eventDate);
    }

    const updated = await updateContact(session, parseInt(id, 10), body);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Contact not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("PUT /api/contacts/[id] error:", error);
    const message = error instanceof Error ? error.message : "Failed to update contact";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status }
    );
  }
}

// PATCH /api/contacts/[id] - Partial update contact
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { id } = await params;
    const body = await request.json();

    // Handle date conversion
    if (body.eventDate) {
      body.eventDate = new Date(body.eventDate);
    }

    const updated = await updateContact(session, parseInt(id, 10), body);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Contact not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("PATCH /api/contacts/[id] error:", error);
    const message = error instanceof Error ? error.message : "Failed to update contact";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status }
    );
  }
}

// DELETE /api/contacts/[id] - Delete contact (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { id } = await params;

    await deleteContact(session, parseInt(id, 10));

    return NextResponse.json({
      success: true,
      data: { message: "Contact deleted" },
    });
  } catch (error) {
    console.error("DELETE /api/contacts/[id] error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete contact";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
