import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { getLeads, getLeadsByStage, createLead } from "@/lib/crm";
import { updateContact, getContact } from "@/lib/contacts";
import { notifyNewLead } from "@/lib/push-notifications";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";
import { db } from "@/db";
import { leadTodoTemplates, leadTodos } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

// GET /api/crm/leads - List leads
export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:read");
    const { searchParams } = new URL(request.url);

    const view = searchParams.get("view"); // "kanban" or "list"
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;

    if (view === "kanban") {
      const stagesWithLeads = await getLeadsByStage(session);
      return ok(stagesWithLeads);
    }

    const result = await getLeads(session, { page, limit, search, status });

    return ok({ data: result.data, meta: result.meta });
  }, "GET /api/crm/leads");
}

// POST /api/crm/leads - Create lead
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const body = await request.json();

    const { title, description, value, currency, stageId, probability, expectedCloseDate, source, contactId, companyId, personId, assignedTo } = body;

    if (!title) {
      return badRequest("Title is required");
    }

    if (!contactId) {
      return badRequest("Contact is required for leads");
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

    // Auto-apply todo templates for this org
    const templates = await db
      .select()
      .from(leadTodoTemplates)
      .where(eq(leadTodoTemplates.organizationId, session.organizationId))
      .orderBy(asc(leadTodoTemplates.sortOrder), asc(leadTodoTemplates.createdAt));

    if (templates.length > 0) {
      await db.insert(leadTodos).values(
        templates.map((t, i) => ({
          leadId: lead.id,
          organizationId: session.organizationId,
          text: t.text,
          done: false,
          sortOrder: i,
        }))
      );
    }

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

    return ok(lead);
  }, "POST /api/crm/leads");
}
