import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { formFields, forms } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { notFoundError, validationError } from "@/lib/api/api-errors";
import { z } from "zod";

async function verifyFormAccess(formId: number, orgId: number) {
  const [form] = await db.select({ id: forms.id, status: forms.status }).from(forms)
    .where(and(eq(forms.id, formId), eq(forms.organizationId, orgId))).limit(1);
  if (!form) throw notFoundError("Form", String(formId));
  return form;
}

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const formId = parseInt(params.id, 10);
    if (isNaN(formId)) throw validationError("Invalid form ID.", "id");
    await verifyFormAccess(formId, session.organizationId);

    const fields = await db.select().from(formFields)
      .where(eq(formFields.formId, formId))
      .orderBy(asc(formFields.sortOrder));

    return { data: { object: "list", data: fields.map((f) => ({ object: "form_field", ...f })), url: `/api/v1/forms/${formId}/fields` } };
  },
  { scope: "forms:read" }
);

const fieldSchema = z.object({
  type: z.string(),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  crm_mapping: z.string().optional(),
  options: z.unknown().optional(),
  sort_order: z.number().int().optional(),
  config: z.unknown().optional(),
});

export const PUT = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const formId = parseInt(params.id, 10);
    if (isNaN(formId)) throw validationError("Invalid form ID.", "id");
    const form = await verifyFormAccess(formId, session.organizationId);

    if (form.status !== "draft") {
      throw validationError("Cannot modify fields of an active or paused form.", "status");
    }

    const body = await request.json();
    const fields = z.array(fieldSchema).safeParse(body.fields || body);
    if (!fields.success) throw validationError(fields.error.issues[0].message, "fields");

    // Delete existing and re-insert (replace all)
    await db.delete(formFields).where(eq(formFields.formId, formId));

    if (fields.data.length > 0) {
      await db.insert(formFields).values(
        fields.data.map((f, i) => ({
          formId,
          type: f.type,
          label: f.label,
          placeholder: f.placeholder,
          required: f.required || false,
          crmMapping: f.crm_mapping,
          options: f.options,
          sortOrder: f.sort_order ?? i,
          config: f.config || {},
        }))
      );
    }

    const updated = await db.select().from(formFields)
      .where(eq(formFields.formId, formId))
      .orderBy(asc(formFields.sortOrder));

    return { data: { object: "list", data: updated.map((f) => ({ object: "form_field", ...f })), url: `/api/v1/forms/${formId}/fields` } };
  },
  { scope: "forms:write" }
);
