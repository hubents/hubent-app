import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { permissions } from "@/db/schema";
import { apiHandler, ok } from "@/lib/api-handler";

/**
 * GET /api/permissions
 * List all permissions grouped by resource
 */
export async function GET() {
  return apiHandler(async () => {
    await requirePermission("team:read");

    const allPerms = await db
      .select()
      .from(permissions)
      .orderBy(permissions.resource, permissions.action);

    // Group by resource
    const grouped: Record<string, typeof allPerms> = {};
    for (const perm of allPerms) {
      if (!grouped[perm.resource]) {
        grouped[perm.resource] = [];
      }
      grouped[perm.resource].push(perm);
    }

    return ok({
      permissions: allPerms,
      grouped,
    });
  }, "GET /api/permissions");
}
