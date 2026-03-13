import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getVendors, createVendor } from "@/lib/vendors";
import { withMonitoring } from "@/lib/monitoring";

// GET /api/vendors - List vendors
export const GET = withMonitoring(async (request: NextRequest) => {
  const session = await requirePermission("vendors:read");
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await getVendors(session, { page, limit, category, search });

  return NextResponse.json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
}, { name: "GET /api/vendors" });

// POST /api/vendors - Create vendor
export const POST = withMonitoring(async (request: NextRequest) => {
  const session = await requirePermission("vendors:update");
    const body = await request.json();

    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name is required" } },
        { status: 400 }
      );
    }

    const vendor = await createVendor(session, body);

  return NextResponse.json({
    success: true,
    data: vendor,
  });
}, { name: "POST /api/vendors" });
