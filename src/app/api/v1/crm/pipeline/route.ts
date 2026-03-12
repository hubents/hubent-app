import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { leads, leadStages } from "@/db/schema";
import { eq, asc, count, sql } from "drizzle-orm";

export const GET = withApiAuth(
  async (_request: NextRequest, { session }) => {
    const stages = await db.select().from(leadStages)
      .where(eq(leadStages.organizationId, session.organizationId))
      .orderBy(asc(leadStages.sortOrder));

    const leadCounts = await db
      .select({ stageId: leads.stageId, count: count() })
      .from(leads)
      .where(eq(leads.organizationId, session.organizationId))
      .groupBy(leads.stageId);

    const countMap: Record<number, number> = {};
    for (const lc of leadCounts) {
      if (lc.stageId) countMap[lc.stageId] = lc.count;
    }

    const pipeline = stages.map((s) => ({
      object: "pipeline_stage" as const,
      ...s,
      lead_count: countMap[s.id] ?? 0,
    }));

    return { data: { object: "pipeline", stages: pipeline, total_leads: leadCounts.reduce((sum, lc) => sum + lc.count, 0) } };
  },
  { scope: "crm:read" }
);
