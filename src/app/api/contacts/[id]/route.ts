import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { getContact, updateContact, deleteContact } from "@/lib/contacts";
import { apiHandler, ok, notFound } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/contacts/[id] - Get single contact
export async function GET(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:read");
    const { id } = await params;

    const contact = await getContact(session, parseInt(id, 10));

    if (!contact) {
      return notFound("Contact not found");
    }

    return ok(contact);
  }, "GET /api/contacts/[id]");
}

// PUT /api/contacts/[id] - Update contact
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const { id } = await params;
    const body = await request.json();

    // Handle date conversion
    if (body.eventDate) {
      body.eventDate = new Date(body.eventDate);
    }

    const updated = await updateContact(session, parseInt(id, 10), body);

    if (!updated) {
      return notFound("Contact not found");
    }

    return ok(updated);
  }, "PUT /api/contacts/[id]");
}

// PATCH /api/contacts/[id] - Partial update contact
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const { id } = await params;
    const body = await request.json();

    // Handle date conversion
    if (body.eventDate) {
      body.eventDate = new Date(body.eventDate);
    }

    const updated = await updateContact(session, parseInt(id, 10), body);

    if (!updated) {
      return notFound("Contact not found");
    }

    return ok(updated);
  }, "PATCH /api/contacts/[id]");
}

// DELETE /api/contacts/[id] - Delete contact (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const { id } = await params;

    await deleteContact(session, parseInt(id, 10));

    return ok({ message: "Contact deleted" });
  }, "DELETE /api/contacts/[id]");
}
