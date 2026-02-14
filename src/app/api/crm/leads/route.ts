import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getLeads, getLeadsByStage, createLead } from "@/lib/crm";
import { updateContact, getContact } from "@/lib/contacts";
import { notifyNewLead } from "@/lib/push-notifications";

// GET /api/crm/leads - List leads
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission("crm:read");
    const { searchParams } = new URL(request.url);
    
    const view = searchParams.get("view"); // "kanban" or "list"
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;

    if (view === "kanban") {
      const stagesWithLeads = await getLeadsByStage(session);
      return NextResponse.json({
        success: true,
        data: stagesWithLeads,
      });
    }

    const result = await getLeads(session, { page, limit, search, status });

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch leads";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/crm/leads - Create lead
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("crm:manage");
    const body = await request.json();

    const { title, description, value, currency, stageId, probability, expectedCloseDate, source, contactId, companyId, personId, assignedTo } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Title is required" } },
        { status: 400 }
      );
    }

    if (!contactId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Contact is required for leads" } },
        { status: 400 }
      );
    }

    const lead = await createLead(session, {
      title,
      description,
      value,
      currency,
      stageId,
      probability,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
      source,
      contactId,
      companyId,
      personId,
      assignedTo,
    });

    // Mark contact as lead
    await updateContact(session, contactId, { isLead: true }).catch(() => {});

    // Send push notification for new lead
    const contact = await getContact(session, contactId).catch(() => null);
    notifyNewLead(
      session.organizationId.toString(),
      title,
      contact?.name || "Contacto",
      value,
      currency,
      session.user.userId,
      assignedTo
    ).catch(err => console.error("Push notification failed:", err));

    return NextResponse.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create lead";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}
