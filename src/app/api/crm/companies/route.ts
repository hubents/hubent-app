import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { getCompanies, createCompany } from "@/lib/crm";
import { apiHandler, ok, created, badRequest, paginated } from "@/lib/api-handler";

// GET /api/crm/companies - List companies
export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:read");
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || undefined;

    const result = await getCompanies(session, { page, limit, search });

    return paginated(result.data, result.meta);
  }, "GET /api/crm/companies");
}

// POST /api/crm/companies - Create company
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const body = await request.json();

    const { legalName } = body;

    if (!legalName) {
      return badRequest("Legal name is required");
    }

    const company = await createCompany(session, body);

    return created(company);
  }, "POST /api/crm/companies");
}
