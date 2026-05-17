import { requireAuth } from "@/lib/session";
import { getOrgEntitlements } from "@/lib/entitlements";
import { apiHandler, ok } from "@/lib/api-handler";

/**
 * GET /api/entitlements
 * Returns current org's plan, features, limits, and usage
 */
export async function GET() {
  return apiHandler(async () => {
    const session = await requireAuth();
    const entitlements = await getOrgEntitlements(session.organizationId);
    return ok(entitlements);
  }, "GET /api/entitlements");
}
