import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { organizations, organizationFinanceSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUsage } from "@/lib/entitlements";

export const GET = withApiAuth(
  async (_request: NextRequest, { session }) => {
    const [org] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        orgType: organizations.orgType,
        logo: organizations.logo,
        status: organizations.status,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .where(eq(organizations.id, session.organizationId))
      .limit(1);

    const usage = await getUsage(session.organizationId);

    return {
      data: {
        object: "organization",
        id: org.id,
        name: org.name,
        slug: org.slug,
        orgType: org.orgType,
        logo: org.logo,
        status: org.status,
        createdAt: org.createdAt,
        plan: session.plan
          ? {
              slug: session.plan.slug,
              name: session.plan.name,
              limits: session.plan.limits,
            }
          : null,
        subscriptionStatus: session.subscriptionStatus,
        usage,
        apiKey: {
          id: session.apiKeyId,
          name: session.apiKeyName,
          scopes: session.scopes,
          environment: session.environment,
        },
      },
    };
  },
  { scope: "organization:read" }
);
