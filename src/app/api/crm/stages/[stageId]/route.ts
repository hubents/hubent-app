import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { leadStages, leads } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

type RouteParams = { params: Promise<{ stageId: string }> };

// GET /api/crm/stages/[stageId] - Get single stage with lead count
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("crm:read");
    const { stageId } = await params;

    const stage = await db.query.leadStages.findFirst({
      where: and(
        eq(leadStages.id, parseInt(stageId, 10)),
        eq(leadStages.organizationId, session.organizationId)
      ),
    });

    if (!stage) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Stage not found" } },
        { status: 404 }
      );
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

    return NextResponse.json({
      success: true,
      data: {
        ...stage,
        leadCount: leadsInStage.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch stage";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// PUT /api/crm/stages/[stageId] - Update stage
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
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
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Stage not found" } },
        { status: 404 }
      );
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

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update stage";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/crm/stages/[stageId] - Delete stage
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
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
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Stage not found" } },
        { status: 404 }
      );
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
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: "HAS_LEADS", 
            message: `No se puede eliminar la etapa porque tiene ${leadsInStage.length} lead(s). Mueve los leads a otra etapa primero.` 
          } 
        },
        { status: 400 }
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

    return NextResponse.json({
      success: true,
      data: { message: "Stage deleted" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete stage";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
