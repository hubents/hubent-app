import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { getLead, updateLead, deleteLead, moveLead } from "@/lib/crm";
import { apiHandler, ok, notFound } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ leadId: string }> };

// GET /api/crm/leads/[leadId] - Get single lead
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:read");
    const { leadId } = await params;

    const lead = await getLead(session, parseInt(leadId, 10));

    if (!lead) {
      return notFound("Lead not found");
    }

    return ok(lead);
  }, "GET /api/crm/leads/[leadId]");
}

// PATCH /api/crm/leads/[leadId] - Update lead
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const { leadId } = await params;
    const body = await request.json();

    // Check if this is a move operation (only stageId)
    if (body.stageId && Object.keys(body).length === 1) {
      const updated = await moveLead(session, parseInt(leadId, 10), body.stageId);
      return ok(updated);
    }

    const updated = await updateLead(session, parseInt(leadId, 10), body);

    if (!updated) {
      return notFound("Lead not found");
    }

    return ok(updated);
  }, "PATCH /api/crm/leads/[leadId]");
}

// DELETE /api/crm/leads/[leadId] - Delete lead
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const { leadId } = await params;

    await deleteLead(session, parseInt(leadId, 10));

    return ok({ message: "Lead deleted" });
  }, "DELETE /api/crm/leads/[leadId]");
}
