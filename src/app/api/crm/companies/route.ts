import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getCompanies, createCompany } from "@/lib/crm";

// GET /api/crm/companies - List companies
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole("viewer");
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || undefined;

    const result = await getCompanies(session, { page, limit, search });

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch companies";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/crm/companies - Create company
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole("planner");
    const body = await request.json();

    const { legalName } = body;

    if (!legalName) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Legal name is required" } },
        { status: 400 }
      );
    }

    const company = await createCompany(session, body);

    return NextResponse.json({
      success: true,
      data: company,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create company";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}
