import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getVendor, updateVendor, deleteVendor } from "@/lib/vendors";

type RouteParams = { params: Promise<{ vendorId: string }> };

// GET /api/vendors/[vendorId] - Get single vendor
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("vendors:read");
    const { vendorId } = await params;

    const vendor = await getVendor(session, parseInt(vendorId, 10));

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Vendor not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch vendor";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// PATCH /api/vendors/[vendorId] - Update vendor
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("vendors:update");
    const { vendorId } = await params;
    const body = await request.json();

    const updated = await updateVendor(session, parseInt(vendorId, 10), body);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Vendor not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update vendor";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/vendors/[vendorId] - Delete vendor
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("vendors:update");
    const { vendorId } = await params;

    await deleteVendor(session, parseInt(vendorId, 10));

    return NextResponse.json({
      success: true,
      data: { message: "Vendor deleted" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete vendor";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
