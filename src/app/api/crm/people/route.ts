import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { getPeople, createPerson } from "@/lib/crm";
import { apiHandler, created, badRequest, paginated } from "@/lib/api-handler";

// GET /api/crm/people - List people
export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:read");
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || undefined;

    const result = await getPeople(session, { page, limit, search });

    return paginated(result.data, result.meta);
  }, "GET /api/crm/people");
}

// POST /api/crm/people - Create person
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const body = await request.json();

    const { firstName } = body;

    if (!firstName) {
      return badRequest("First name is required");
    }

    const person = await createPerson(session, body);

    return created(person);
  }, "POST /api/crm/people");
}
