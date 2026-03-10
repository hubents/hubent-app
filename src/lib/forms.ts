import { db } from "@/db";
import {
  forms,
  formFields,
  formInstances,
  formSubmissions,
  type Form,
  type NewForm,
} from "@/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";

export interface FormWithCounts extends Form {
  fieldCount: number;
  instanceCount: number;
  submissionCount: number;
  landingSlug: string | null;
}

export async function listForms(organizationId: number): Promise<FormWithCounts[]> {
  const result = await db.query.forms.findMany({
    where: eq(forms.organizationId, organizationId),
    orderBy: [desc(forms.updatedAt)],
    with: {
      fields: { columns: { id: true } },
      instances: { columns: { id: true, slug: true, type: true } },
      submissions: { columns: { id: true } },
    },
  });

  return result.map((r) => ({
    ...r,
    fields: undefined as never,
    instances: undefined as never,
    submissions: undefined as never,
    fieldCount: r.fields?.length ?? 0,
    instanceCount: r.instances?.length ?? 0,
    submissionCount: r.submissions?.length ?? 0,
    landingSlug: r.instances?.find((i) => i.type === "landing" && i.slug)?.slug ?? null,
  }));
}

export async function getForm(formId: number, organizationId: number) {
  const form = await db.query.forms.findFirst({
    where: and(eq(forms.id, formId), eq(forms.organizationId, organizationId)),
    with: {
      fields: {
        orderBy: (f, { asc }) => [asc(f.sortOrder)],
      },
      instances: true,
    },
  });
  return form ?? null;
}

export async function getFormById(formId: number) {
  return db.query.forms.findFirst({
    where: eq(forms.id, formId),
    with: {
      fields: {
        orderBy: (f, { asc }) => [asc(f.sortOrder)],
      },
    },
  });
}

export async function createForm(
  data: Pick<NewForm, "organizationId" | "name" | "description" | "createdBy">
): Promise<Form> {
  const [form] = await db
    .insert(forms)
    .values({
      organizationId: data.organizationId,
      name: data.name,
      description: data.description || null,
      createdBy: data.createdBy,
      status: "draft",
    })
    .returning();
  return form;
}

export async function updateForm(
  formId: number,
  organizationId: number,
  data: Partial<Omit<NewForm, "id" | "organizationId" | "createdBy" | "createdAt">>
): Promise<Form | null> {
  const [updated] = await db
    .update(forms)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(forms.id, formId), eq(forms.organizationId, organizationId)))
    .returning();
  return updated ?? null;
}

export async function updateFormStatus(
  formId: number,
  organizationId: number,
  status: "draft" | "active" | "paused"
): Promise<Form | null> {
  const [updated] = await db
    .update(forms)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(forms.id, formId), eq(forms.organizationId, organizationId)))
    .returning();
  return updated ?? null;
}

export async function deleteForm(formId: number, organizationId: number): Promise<boolean> {
  const result = await db
    .delete(forms)
    .where(and(eq(forms.id, formId), eq(forms.organizationId, organizationId)))
    .returning({ id: forms.id });
  return result.length > 0;
}

export async function duplicateForm(
  formId: number,
  organizationId: number,
  userId: string
): Promise<Form | null> {
  const original = await getForm(formId, organizationId);
  if (!original) return null;

  const [newForm] = await db
    .insert(forms)
    .values({
      organizationId,
      name: `${original.name} (copia)`,
      description: original.description,
      status: "draft",
      logoUrl: original.logoUrl,
      coverImage: original.coverImage,
      primaryColor: original.primaryColor,
      submitButtonText: original.submitButtonText,
      thankYouTitle: original.thankYouTitle,
      thankYouMessage: original.thankYouMessage,
      redirectUrl: original.redirectUrl,
      defaultEventType: original.defaultEventType,
      notifyOnResponse: original.notifyOnResponse,
      notifyEmail: original.notifyEmail,
      gdprEnabled: original.gdprEnabled,
      gdprText: original.gdprText,
      gdprLink: original.gdprLink,
      createdBy: userId,
    })
    .returning();

  if (original.fields && original.fields.length > 0) {
    await db.insert(formFields).values(
      original.fields.map((f) => ({
        formId: newForm.id,
        type: f.type,
        label: f.label,
        placeholder: f.placeholder,
        required: f.required,
        crmMapping: f.crmMapping,
        options: f.options,
        sortOrder: f.sortOrder,
        config: f.config,
      }))
    );
  }

  return newForm;
}

export async function getFormCount(organizationId: number): Promise<number> {
  const [result] = await db
    .select({ total: count() })
    .from(forms)
    .where(and(eq(forms.organizationId, organizationId), eq(forms.status, "active")));
  return result?.total ?? 0;
}
