import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getCompany, updateCompany, deleteCompany, getCompanyPeople } from "@/lib/crm";

type RouteParams = { params: Promise<{ companyId: string }> };

// GET /api/crm/companies/[companyId] - Get single company
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("viewer");
    const { companyId } = await params;
    const { searchParams } = new URL(request.url);
    const includePeople = searchParams.get("includePeople") === "true";

    const company = await getCompany(session, parseInt(companyId, 10));

    if (!company) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Company not found" } },
        { status: 404 }
      );
    }

    let people: Awaited<ReturnType<typeof getCompanyPeople>> = [];
    if (includePeople) {
      people = await getCompanyPeople(parseInt(companyId, 10));
    }

    return NextResponse.json({
      success: true,
      data: {
        ...company,
        people: includePeople ? people : undefined,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch company";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// PATCH /api/crm/companies/[companyId] - Update company
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { companyId } = await params;
    const body = await request.json();

    const updated = await updateCompany(session, parseInt(companyId, 10), body);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Company not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update company";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/crm/companies/[companyId] - Delete company
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { companyId } = await params;

    await deleteCompany(session, parseInt(companyId, 10));

    return NextResponse.json({
      success: true,
      data: { message: "Company deleted" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete company";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
