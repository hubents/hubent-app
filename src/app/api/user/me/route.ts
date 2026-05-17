import { requireAuth } from "@/lib/session";
import { apiHandler, ok } from "@/lib/api-handler";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/user/me
 * Returns current user's role, permissions, and org location for client-side use.
 */
export async function GET() {
  return apiHandler(async () => {
    const session = await requireAuth();

    const [org] = await db
      .select({ country: organizations.country, city: organizations.city, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, session.organizationId))
      .limit(1);

    return ok({
      userId: session.user.userId,
      name: session.user.name,
      role: session.role,
      permissions: session.permissions,
      organizationId: session.organizationId,
      orgName: org?.name ?? null,
      orgCountry: org?.country ?? null,
      orgCity: org?.city ?? null,
      isImpersonating: session.isImpersonating || false,
      eventScoped: session.eventScoped,
      orgType: session.orgType,
      providerModule: session.providerModule ?? null,
    });
  }, "GET /api/user/me");
}
