import { db } from "@/db";
import {
  formSubmissions,
  formInstances,
  forms,
  leads,
  contacts,
  type FormSubmission,
} from "@/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";

export interface SubmissionInput {
  instanceId: number;
  formId: number;
  data: Record<string, unknown>;
  respondentName?: string | null;
  respondentEmail?: string | null;
  respondentUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createSubmission(input: SubmissionInput): Promise<FormSubmission> {
  const [submission] = await db
    .insert(formSubmissions)
    .values({
      instanceId: input.instanceId,
      formId: input.formId,
      data: input.data,
      respondentName: input.respondentName || null,
      respondentEmail: input.respondentEmail || null,
      respondentUserId: input.respondentUserId || null,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
    })
    .returning();
  return submission;
}

export async function linkSubmissionToLead(
  submissionId: number,
  leadId: number
): Promise<void> {
  await db
    .update(formSubmissions)
    .set({ leadId })
    .where(eq(formSubmissions.id, submissionId));
}

export async function linkSubmissionToContact(
  submissionId: number,
  contactId: number
): Promise<void> {
  await db
    .update(formSubmissions)
    .set({ contactId })
    .where(eq(formSubmissions.id, submissionId));
}

export async function getSubmissionsByInstance(
  instanceId: number,
  limit = 50,
  offset = 0
) {
  const rows = await db
    .select()
    .from(formSubmissions)
    .where(eq(formSubmissions.instanceId, instanceId))
    .orderBy(desc(formSubmissions.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ total: count() })
    .from(formSubmissions)
    .where(eq(formSubmissions.instanceId, instanceId));

  return { rows, total: countResult?.total ?? 0 };
}

export async function getSubmissionsByForm(
  formId: number,
  limit = 50,
  offset = 0
) {
  const rows = await db
    .select()
    .from(formSubmissions)
    .where(eq(formSubmissions.formId, formId))
    .orderBy(desc(formSubmissions.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ total: count() })
    .from(formSubmissions)
    .where(eq(formSubmissions.formId, formId));

  return { rows, total: countResult?.total ?? 0 };
}

export async function getOrgSubmissions(
  organizationId: number,
  limit = 50,
  offset = 0
) {
  const rows = await db
    .select({
      id: formSubmissions.id,
      formId: formSubmissions.formId,
      instanceId: formSubmissions.instanceId,
      respondentName: formSubmissions.respondentName,
      respondentEmail: formSubmissions.respondentEmail,
      createdAt: formSubmissions.createdAt,
      formName: forms.name,
      instanceType: formInstances.type,
      instanceSlug: formInstances.slug,
    })
    .from(formSubmissions)
    .innerJoin(forms, eq(formSubmissions.formId, forms.id))
    .innerJoin(formInstances, eq(formSubmissions.instanceId, formInstances.id))
    .where(eq(forms.organizationId, organizationId))
    .orderBy(desc(formSubmissions.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ total: count() })
    .from(formSubmissions)
    .innerJoin(forms, eq(formSubmissions.formId, forms.id))
    .where(eq(forms.organizationId, organizationId));

  return { rows, total: countResult?.total ?? 0 };
}

export async function getSubmissionById(submissionId: number) {
  return db.query.formSubmissions.findFirst({
    where: eq(formSubmissions.id, submissionId),
  });
}

export interface CrmMappedData {
  name?: string;
  email?: string;
  phone?: string;
  partnerName?: string;
  partnerEmail?: string;
  eventDate?: string;
  venue?: string;
  guestCount?: string;
  budget?: string;
  notes?: string;
}

export function extractCrmData(
  formFields: { type: string; crmMapping: string | null; label: string }[],
  submissionData: Record<string, unknown>
): CrmMappedData {
  const mapped: CrmMappedData = {};

  for (const field of formFields) {
    if (!field.crmMapping) continue;
    const value = submissionData[field.label];
    if (value !== undefined && value !== null && value !== "") {
      (mapped as Record<string, string>)[field.crmMapping] = String(value);
    }
  }

  return mapped;
}

export async function createLeadFromSubmission(
  organizationId: number,
  crmData: CrmMappedData,
  source: string
): Promise<number> {
  const parts: string[] = [];
  if (crmData.name) parts.push(crmData.name);
  if (crmData.email) parts.push(`(${crmData.email})`);

  const description = [
    crmData.phone ? `Tel: ${crmData.phone}` : null,
    crmData.partnerName ? `Pareja: ${crmData.partnerName}` : null,
    crmData.eventDate ? `Fecha evento: ${crmData.eventDate}` : null,
    crmData.venue ? `Lugar: ${crmData.venue}` : null,
    crmData.guestCount ? `Invitados: ${crmData.guestCount}` : null,
    crmData.budget ? `Presupuesto: ${crmData.budget}` : null,
    crmData.notes ? `Notas: ${crmData.notes}` : null,
  ].filter(Boolean).join("\n");

  const [lead] = await db
    .insert(leads)
    .values({
      organizationId,
      title: parts.join(" ") || "Lead desde formulario",
      description: description || null,
      source,
    })
    .returning({ id: leads.id });
  return lead.id;
}

export async function createContactFromSubmission(
  organizationId: number,
  crmData: CrmMappedData,
  source: string
): Promise<number> {
  const [contact] = await db
    .insert(contacts)
    .values({
      organizationId,
      name: crmData.name || "Sin nombre",
      email: crmData.email || null,
      phone: crmData.phone || null,
      source: "website" as const,
      notes: crmData.notes ? `${source} — ${crmData.notes}` : source,
      eventDate: crmData.eventDate ? new Date(crmData.eventDate) : null,
      guestCount: crmData.guestCount ? parseInt(crmData.guestCount, 10) || null : null,
      budget: crmData.budget || null,
      isLead: true,
    })
    .returning({ id: contacts.id });
  return contact.id;
}
