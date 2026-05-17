import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { events, organizationMembers, organizations, subscriptionPlans } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { apiHandler, ok } from "@/lib/api-handler";

// GET /api/user/context - Get current user context including organization
export async function GET() {
  return apiHandler(async () => {
    const session = await requireAuth();

    let tenantStats = undefined;

    // If impersonating, load extra stats for the banner
    if (session.isImpersonating && session.organizationId) {
      const [eventCount] = await db
        .select({ count: count() })
        .from(events)
        .where(eq(events.organizationId, session.organizationId));

      const [memberCount] = await db
        .select({ count: count() })
        .from(organizationMembers)
        .where(eq(organizationMembers.organizationId, session.organizationId));

      const [org] = await db
        .select({
          planName: subscriptionPlans.name,
          status: organizations.status,
        })
        .from(organizations)
        .leftJoin(subscriptionPlans, eq(organizations.planId, subscriptionPlans.id))
        .where(eq(organizations.id, session.organizationId))
        .limit(1);

      tenantStats = {
        totalEvents: eventCount?.count ?? 0,
        totalMembers: memberCount?.count ?? 0,
        planName: org?.planName ?? "Sin plan",
        orgStatus: org?.status ?? "active",
      };
    }

    return ok({
      userId: session.user.userId,
      email: session.user.email,
      name: session.user.name,
      platformLevel: session.user.platformLevel,
      isImpersonating: session.isImpersonating ?? false,
      currentOrganization: session.user.currentOrganization,
      organizations: session.user.organizations,
      tenantStats,
    });
  }, "GET /api/user/context");
}
