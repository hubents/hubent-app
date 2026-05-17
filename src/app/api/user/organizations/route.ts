import { auth } from "@/lib/auth";
import { getUserOrganizations } from "@/lib/tenant";
import { apiHandler, ok } from "@/lib/api-handler";
import { NextResponse } from "next/server";

/**
 * GET /api/user/organizations
 * Returns all organizations the current user belongs to
 */
export async function GET() {
  return apiHandler(async () => {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const organizations = await getUserOrganizations(session.user.id);

    return ok(organizations);
  }, "GET /api/user/organizations");
}
