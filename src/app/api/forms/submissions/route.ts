import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getOrgSubmissions } from "@/lib/form-submissions";
import { apiHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const session = await requirePermission("forms:read");
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const { rows, total } = await getOrgSubmissions(session.organizationId, limit, offset);

    return NextResponse.json({
      success: true,
      data: rows,
      meta: { total, limit, offset },
    });
  }, "GET /api/forms/submissions");
}
