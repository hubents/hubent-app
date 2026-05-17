import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { getVendors, createVendor } from "@/lib/vendors";
import { withMonitoring } from "@/lib/monitoring";
import { apiHandler, ok, badRequest, paginated } from "@/lib/api-handler";

// GET /api/vendors - List vendors
export const GET = withMonitoring(async (request: NextRequest) => {
  return apiHandler(async () => {
    const session = await requirePermission("vendors:read");
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await getVendors(session, { page, limit, category, search });

    return paginated(result.data, result.meta);
  }, "GET /api/vendors");
}, { name: "GET /api/vendors" });

// POST /api/vendors - Create vendor
export const POST = withMonitoring(async (request: NextRequest) => {
  return apiHandler(async () => {
    const session = await requirePermission("vendors:update");
    const body = await request.json();

    const { name } = body;

    if (!name) {
      return badRequest("Name is required");
    }

    const vendor = await createVendor(session, body);

    return ok(vendor);
  }, "POST /api/vendors");
}, { name: "POST /api/vendors" });
