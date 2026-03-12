import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { leads, leadStageHistory } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFoundError, validationError } from "@/lib/api/api-errors";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";
import { z } from "zod";

const moveLeadSchema = z.object({
  stage_id: z.number().int(),
  notes: z.string().optional(),
});

export const POST = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid lead ID.", "id");

    const body = await request.json();
    const parsed = moveLeadSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));

    const [lead] = await db.select().from(leads)
      .where(and(eq(leads.id, id), eq(leads.organizationId, session.organizationId))).limit(1);
    if (!lead) throw notFoundError("Lead", params.id);

    const previousStageId = lead.stageId;
    const d = parsed.data;

    const [updated] = await db.update(leads).set({
      stageId: d.stage_id,
      updatedAt: new Date(),
    }).where(eq(leads.id, id)).returning();

    // Log stage change
    await db.insert(leadStageHistory).values({
      leadId: id,
      fromStageId: previousStageId,
      toStageId: d.stage_id,
    }).catch(() => {});

    void dispatchWebhookEvent(session.organizationId, "lead.stage_changed", { id: updated.id, from_stage_id: previousStageId, to_stage_id: d.stage_id }).catch(() => {});

    return { data: { object: "lead", ...updated } };
  },
  { scope: "crm:write", idempotent: true }
);
