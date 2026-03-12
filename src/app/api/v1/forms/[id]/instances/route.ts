import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { formInstances, forms } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFoundError, validationError } from "@/lib/api/api-errors";

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const formId = parseInt(params.id, 10);
    if (isNaN(formId)) throw validationError("Invalid form ID.", "id");

    const [form] = await db.select({ id: forms.id }).from(forms)
      .where(and(eq(forms.id, formId), eq(forms.organizationId, session.organizationId))).limit(1);
    if (!form) throw notFoundError("Form", params.id);

    const instances = await db.select().from(formInstances)
      .where(eq(formInstances.formId, formId));

    return { data: { object: "list", data: instances.map((i) => ({ object: "form_instance", ...i })), url: `/api/v1/forms/${formId}/instances` } };
  },
  { scope: "forms:read" }
);
