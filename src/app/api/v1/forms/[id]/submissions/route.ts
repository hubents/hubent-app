import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { formSubmissions, forms } from "@/db/schema";
import { eq, and, desc, gt, count } from "drizzle-orm";
import { notFoundError, validationError } from "@/lib/api/api-errors";
import { parsePaginationParams, buildPaginatedResponse } from "@/lib/api/api-utils";

export const GET = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const formId = parseInt(params.id, 10);
    if (isNaN(formId)) throw validationError("Invalid form ID.", "id");

    const [form] = await db.select({ id: forms.id }).from(forms)
      .where(and(eq(forms.id, formId), eq(forms.organizationId, session.organizationId))).limit(1);
    if (!form) throw notFoundError("Form", params.id);

    const { searchParams } = new URL(request.url);
    const { limit, startingAfter } = parsePaginationParams(searchParams);

    let whereClause = eq(formSubmissions.formId, formId);
    if (startingAfter) {
      whereClause = and(whereClause, gt(formSubmissions.id, startingAfter))!;
    }

    const [totalResult] = await db.select({ count: count() }).from(formSubmissions)
      .where(eq(formSubmissions.formId, formId));

    const results = await db.select().from(formSubmissions)
      .where(whereClause).orderBy(desc(formSubmissions.createdAt)).limit(limit);

    return {
      data: buildPaginatedResponse(
        results.map((s) => ({ object: "form_submission" as const, ...s })),
        totalResult?.count ?? 0,
        `/api/v1/forms/${formId}/submissions`,
        limit
      ),
    };
  },
  { scope: "forms:read" }
);
