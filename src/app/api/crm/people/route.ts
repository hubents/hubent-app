import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getPeople, createPerson } from "@/lib/crm";

// GET /api/crm/people - List people
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission("crm:read");
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || undefined;

    const result = await getPeople(session, { page, limit, search });

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch people";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/crm/people - Create person
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("crm:manage");
    const body = await request.json();

    const { firstName } = body;

    if (!firstName) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "First name is required" } },
        { status: 400 }
      );
    }

    const person = await createPerson(session, body);

    return NextResponse.json({
      success: true,
      data: person,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create person";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}
