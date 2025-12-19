import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getLead, updateLead, deleteLead, moveLead } from "@/lib/crm";

type RouteParams = { params: Promise<{ leadId: string }> };

// GET /api/crm/leads/[leadId] - Get single lead
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("viewer");
    const { leadId } = await params;

    const lead = await getLead(session, parseInt(leadId, 10));

    if (!lead) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Lead not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch lead";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// PATCH /api/crm/leads/[leadId] - Update lead
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { leadId } = await params;
    const body = await request.json();

    // Check if this is a move operation (only stageId)
    if (body.stageId && Object.keys(body).length === 1) {
      const updated = await moveLead(session, parseInt(leadId, 10), body.stageId);
      return NextResponse.json({
        success: true,
        data: updated,
      });
    }

    const updated = await updateLead(session, parseInt(leadId, 10), body);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Lead not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update lead";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/crm/leads/[leadId] - Delete lead
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { leadId } = await params;

    await deleteLead(session, parseInt(leadId, 10));

    return NextResponse.json({
      success: true,
      data: { message: "Lead deleted" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete lead";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
