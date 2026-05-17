import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { getVendor, updateVendor, deleteVendor } from "@/lib/vendors";
import { apiHandler, ok, notFound } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ vendorId: string }> };

// GET /api/vendors/[vendorId] - Get single vendor
export async function GET(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("vendors:read");
    const { vendorId } = await params;

    const vendor = await getVendor(session, parseInt(vendorId, 10));

    if (!vendor) {
      return notFound("Vendor not found");
    }

    return ok(vendor);
  }, "GET /api/vendors/[vendorId]");
}

// PATCH /api/vendors/[vendorId] - Update vendor
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("vendors:update");
    const { vendorId } = await params;
    const body = await request.json();

    const updated = await updateVendor(session, parseInt(vendorId, 10), body);

    if (!updated) {
      return notFound("Vendor not found");
    }

    return ok(updated);
  }, "PATCH /api/vendors/[vendorId]");
}

// DELETE /api/vendors/[vendorId] - Delete vendor
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("vendors:update");
    const { vendorId } = await params;

    await deleteVendor(session, parseInt(vendorId, 10));

    return ok({ message: "Vendor deleted" });
  }, "DELETE /api/vendors/[vendorId]");
}
