import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { leadStages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const GET = withApiAuth(
  async (_request: NextRequest, { session }) => {
    const stages = await db.select().from(leadStages)
      .where(eq(leadStages.organizationId, session.organizationId))
      .orderBy(asc(leadStages.sortOrder));

    return { data: { object: "list", data: stages.map((s) => ({ object: "lead_stage", ...s })), url: "/api/v1/crm/stages" } };
  },
  { scope: "crm:read" }
);
