import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { forms } from "@/db/schema";
import { eq, and, desc, gt, count, ilike } from "drizzle-orm";
import { parsePaginationParams, buildPaginatedResponse, parseFilterParams } from "@/lib/api/api-utils";
import { validationError } from "@/lib/api/api-errors";
import { z } from "zod";

const createFormSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "paused"]).optional(),
  primary_color: z.string().optional(),
  submit_button_text: z.string().optional(),
  thank_you_title: z.string().optional(),
  thank_you_message: z.string().optional(),
  redirect_url: z.string().optional(),
  default_event_type: z.string().optional(),
  notify_on_response: z.boolean().optional(),
  notify_email: z.string().email().optional(),
  gdpr_enabled: z.boolean().optional(),
  gdpr_text: z.string().optional(),
  crm_create_contact: z.boolean().optional(),
  crm_create_lead: z.boolean().optional(),
});

export const GET = withApiAuth(
  async (request: NextRequest, { session }) => {
    const { searchParams } = new URL(request.url);
    const { limit, startingAfter } = parsePaginationParams(searchParams);
    const filters = parseFilterParams(searchParams, ["status", "search"]);

    let whereClause = eq(forms.organizationId, session.organizationId);

    if (filters.status) {
      whereClause = and(whereClause, eq(forms.status, filters.status))!;
    }
    if (filters.search) {
      whereClause = and(whereClause, ilike(forms.name, `%${filters.search}%`))!;
    }
    if (startingAfter) {
      whereClause = and(whereClause, gt(forms.id, startingAfter))!;
    }

    const [totalResult] = await db.select({ count: count() }).from(forms)
      .where(eq(forms.organizationId, session.organizationId));

    const results = await db.select({
      id: forms.id,
      name: forms.name,
      description: forms.description,
      status: forms.status,
      primaryColor: forms.primaryColor,
      submitButtonText: forms.submitButtonText,
      thankYouTitle: forms.thankYouTitle,
      thankYouMessage: forms.thankYouMessage,
      redirectUrl: forms.redirectUrl,
      defaultEventType: forms.defaultEventType,
      notifyOnResponse: forms.notifyOnResponse,
      notifyEmail: forms.notifyEmail,
      gdprEnabled: forms.gdprEnabled,
      crmCreateContact: forms.crmCreateContact,
      crmCreateLead: forms.crmCreateLead,
      createdAt: forms.createdAt,
      updatedAt: forms.updatedAt,
    }).from(forms).where(whereClause).orderBy(desc(forms.createdAt)).limit(limit);

    return {
      data: buildPaginatedResponse(
        results.map((f) => ({ object: "form" as const, ...f })),
        totalResult?.count ?? 0,
        "/api/v1/forms",
        limit
      ),
    };
  },
  { scope: "forms:read" }
);

export const POST = withApiAuth(
  async (request: NextRequest, { session }) => {
    const body = await request.json();
    const parsed = createFormSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));

    const d = parsed.data;
    const [form] = await db.insert(forms).values({
      organizationId: session.organizationId,
      name: d.name,
      description: d.description,
      status: d.status || "draft",
      primaryColor: d.primary_color,
      submitButtonText: d.submit_button_text,
      thankYouTitle: d.thank_you_title,
      thankYouMessage: d.thank_you_message,
      redirectUrl: d.redirect_url,
      defaultEventType: d.default_event_type,
      notifyOnResponse: d.notify_on_response,
      notifyEmail: d.notify_email,
      gdprEnabled: d.gdpr_enabled,
      crmCreateContact: d.crm_create_contact,
      crmCreateLead: d.crm_create_lead,
    }).returning();

    return { status: 201, data: { object: "form", ...form } };
  },
  { scope: "forms:write", idempotent: true }
);
