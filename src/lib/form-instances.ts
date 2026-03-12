import { db } from "@/db";
import {
  formInstances,
  formSubmissions,
  forms,
  type FormInstance,
  type NewFormInstance,
} from "@/db/schema";
import { eq, and, sql, count } from "drizzle-orm";

export interface FormInstanceWithCounts extends FormInstance {
  submissionCount: number;
  formName?: string;
}

export async function listFormInstances(formId: number): Promise<FormInstanceWithCounts[]> {
  const result = await db
    .select({
      instance: formInstances,
      submissionCount: sql<number>`(SELECT COUNT(*) FROM form_submissions WHERE instance_id = ${formInstances.id})`.as("submission_count"),
      formName: forms.name,
    })
    .from(formInstances)
    .leftJoin(forms, eq(formInstances.formId, forms.id))
    .where(eq(formInstances.formId, formId))
    .orderBy(formInstances.createdAt);

  return result.map((r) => ({
    ...r.instance,
    submissionCount: Number(r.submissionCount),
    formName: r.formName ?? undefined,
  }));
}

export async function createFormInstance(
  data: Pick<NewFormInstance, "formId" | "organizationId" | "type" | "slug" | "eventId" | "taskId" | "createdBy">
): Promise<FormInstance> {
  const [instance] = await db
    .insert(formInstances)
    .values({
      formId: data.formId,
      organizationId: data.organizationId,
      type: data.type,
      slug: data.slug || null,
      eventId: data.eventId || null,
      taskId: data.taskId || null,
      status: "active",
      createdBy: data.createdBy,
    })
    .returning();
  return instance;
}

export async function getEventFormInstances(eventId: number, organizationId: number): Promise<FormInstanceWithCounts[]> {
  const result = await db
    .select({
      instance: formInstances,
      submissionCount: sql<number>`(SELECT COUNT(*) FROM form_submissions WHERE instance_id = ${formInstances.id})`.as("submission_count"),
      formName: forms.name,
    })
    .from(formInstances)
    .leftJoin(forms, eq(formInstances.formId, forms.id))
    .where(and(eq(formInstances.eventId, eventId), eq(formInstances.organizationId, organizationId)))
    .orderBy(formInstances.createdAt);

  return result.map((r) => ({
    ...r.instance,
    submissionCount: Number(r.submissionCount),
    formName: r.formName ?? undefined,
  }));
}

export async function getFormInstanceBySlug(slug: string) {
  return db.query.formInstances.findFirst({
    where: and(eq(formInstances.slug, slug), eq(formInstances.status, "active")),
    with: {
      form: {
        with: {
          fields: {
            orderBy: (f, { asc }) => [asc(f.sortOrder)],
          },
        },
      },
    },
  });
}

export async function getFormInstanceById(instanceId: number) {
  return db.query.formInstances.findFirst({
    where: eq(formInstances.id, instanceId),
    with: {
      form: {
        with: {
          fields: {
            orderBy: (f, { asc }) => [asc(f.sortOrder)],
          },
        },
      },
    },
  });
}

export async function getTaskFormInstances(taskId: number, organizationId: number): Promise<FormInstanceWithCounts[]> {
  const result = await db
    .select({
      instance: formInstances,
      submissionCount: sql<number>`(SELECT COUNT(*) FROM form_submissions WHERE instance_id = ${formInstances.id})`.as("submission_count"),
      formName: forms.name,
    })
    .from(formInstances)
    .leftJoin(forms, eq(formInstances.formId, forms.id))
    .where(and(eq(formInstances.taskId, taskId), eq(formInstances.type, "task"), eq(formInstances.organizationId, organizationId)))
    .orderBy(formInstances.createdAt);

  return result.map((r) => ({
    ...r.instance,
    submissionCount: Number(r.submissionCount),
    formName: r.formName ?? undefined,
  }));
}

export async function deleteFormInstance(
  instanceId: number,
  organizationId: number
): Promise<boolean> {
  const result = await db
    .delete(formInstances)
    .where(
      and(
        eq(formInstances.id, instanceId),
        eq(formInstances.organizationId, organizationId)
      )
    )
    .returning({ id: formInstances.id });
  return result.length > 0;
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50)
    + "-" + Math.random().toString(36).slice(2, 8);
}
