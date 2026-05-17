import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { getCompany, updateCompany, deleteCompany, getCompanyPeople } from "@/lib/crm";
import { apiHandler, ok, notFound } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ companyId: string }> };

// GET /api/crm/companies/[companyId] - Get single company
export async function GET(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:read");
    const { companyId } = await params;
    const { searchParams } = new URL(request.url);
    const includePeople = searchParams.get("includePeople") === "true";

    const company = await getCompany(session, parseInt(companyId, 10));

    if (!company) {
      return notFound("Company not found");
    }

    let people: Awaited<ReturnType<typeof getCompanyPeople>> = [];
    if (includePeople) {
      people = await getCompanyPeople(parseInt(companyId, 10));
    }

    return ok({
      ...company,
      people: includePeople ? people : undefined,
    });
  }, "GET /api/crm/companies/[companyId]");
}

// PATCH /api/crm/companies/[companyId] - Update company
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const { companyId } = await params;
    const body = await request.json();

    const updated = await updateCompany(session, parseInt(companyId, 10), body);

    if (!updated) {
      return notFound("Company not found");
    }

    return ok(updated);
  }, "PATCH /api/crm/companies/[companyId]");
}

// DELETE /api/crm/companies/[companyId] - Delete company
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const { companyId } = await params;

    await deleteCompany(session, parseInt(companyId, 10));

    return ok({ message: "Company deleted" });
  }, "DELETE /api/crm/companies/[companyId]");
}
