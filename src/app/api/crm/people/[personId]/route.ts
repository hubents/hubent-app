import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { getPerson, updatePerson, deletePerson } from "@/lib/crm";
import { apiHandler, ok, notFound } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ personId: string }> };

// GET /api/crm/people/[personId] - Get single person
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:read");
    const { personId } = await params;

    const person = await getPerson(session, parseInt(personId, 10));

    if (!person) {
      return notFound("Person not found");
    }

    return ok(person);
  }, "GET /api/crm/people/[personId]");
}

// PATCH /api/crm/people/[personId] - Update person
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const { personId } = await params;
    const body = await request.json();

    const updated = await updatePerson(session, parseInt(personId, 10), body);

    if (!updated) {
      return notFound("Person not found");
    }

    return ok(updated);
  }, "PATCH /api/crm/people/[personId]");
}

// DELETE /api/crm/people/[personId] - Delete person
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const { personId } = await params;

    await deletePerson(session, parseInt(personId, 10));

    return ok({ message: "Person deleted" });
  }, "DELETE /api/crm/people/[personId]");
}
