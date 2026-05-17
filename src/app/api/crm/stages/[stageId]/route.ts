import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { leadStages, leads } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { apiHandler, ok, notFound, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ stageId: string }> };

// GET /api/crm/stages/[stageId] - Get single stage with lead count
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:read");
    const { stageId } = await params;

    const stage = await db.query.leadStages.findFirst({
      where: and(
        eq(leadStages.id, parseInt(stageId, 10)),
        eq(leadStages.organizationId, session.organizationId)
      ),
    });

    if (!stage) {
      return notFound("Stage not found");
    }

    // Get lead count for this stage
    const leadsInStage = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(
          eq(leads.stageId, stage.id),
          eq(leads.organizationId, session.organizationId),
          isNull(leads.deletedAt)
        )
      );

    return ok({ ...stage, leadCount: leadsInStage.length });
  }, "GET /api/crm/stages/[stageId]");
}

// PUT /api/crm/stages/[stageId] - Update stage
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const { stageId } = await params;
    const body = await request.json();

    const { name, color, sortOrder, isDefault, isWon, isLost } = body;

    // Verify stage belongs to organization
    const existingStage = await db.query.leadStages.findFirst({
      where: and(
        eq(leadStages.id, parseInt(stageId, 10)),
        eq(leadStages.organizationId, session.organizationId)
      ),
    });

    if (!existingStage) {
      return notFound("Stage not found");
    }

    // If setting as default, unset other defaults
    if (isDefault === true) {
      await db.update(leadStages)
        .set({ isDefault: false })
        .where(eq(leadStages.organizationId, session.organizationId));
    }

    // Update stage
    const [updated] = await db.update(leadStages)
      .set({
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isWon !== undefined && { isWon }),
        ...(isLost !== undefined && { isLost }),
      })
      .where(
        and(
          eq(leadStages.id, parseInt(stageId, 10)),
          eq(leadStages.organizationId, session.organizationId)
        )
      )
      .returning();

    return ok(updated);
  }, "PUT /api/crm/stages/[stageId]");
}

// DELETE /api/crm/stages/[stageId] - Delete stage
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const { stageId } = await params;
    const stageIdNum = parseInt(stageId, 10);

    // Verify stage belongs to organization
    const existingStage = await db.query.leadStages.findFirst({
      where: and(
        eq(leadStages.id, stageIdNum),
        eq(leadStages.organizationId, session.organizationId)
      ),
    });

    if (!existingStage) {
      return notFound("Stage not found");
    }

    // Check if there are leads in this stage
    const leadsInStage = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(
          eq(leads.stageId, stageIdNum),
          eq(leads.organizationId, session.organizationId),
          isNull(leads.deletedAt)
        )
      );

    if (leadsInStage.length > 0) {
      return badRequest(
        `No se puede eliminar la etapa porque tiene ${leadsInStage.length} lead(s). Mueve los leads a otra etapa primero.`,
        "HAS_LEADS"
      );
    }

    // Delete stage
    await db.delete(leadStages)
      .where(
        and(
          eq(leadStages.id, stageIdNum),
          eq(leadStages.organizationId, session.organizationId)
        )
      );

    return ok({ message: "Stage deleted" });
  }, "DELETE /api/crm/stages/[stageId]");
}
