import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { contactActivities, contacts } from "@/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { validationError, notFoundError } from "@/lib/api/api-errors";
import { z } from "zod";

async function verifyContactAccess(contactId: number, orgId: number) {
  const [contact] = await db.select({ id: contacts.id }).from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.organizationId, orgId), isNull(contacts.deletedAt))).limit(1);
  if (!contact) throw notFoundError("Contact", String(contactId));
}

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const contactId = parseInt(params.id, 10);
    if (isNaN(contactId)) throw validationError("Invalid contact ID.", "id");
    await verifyContactAccess(contactId, session.organizationId);

    const activities = await db.select().from(contactActivities)
      .where(eq(contactActivities.contactId, contactId))
      .orderBy(desc(contactActivities.createdAt))
      .limit(50);

    return { data: { object: "list", data: activities.map((a) => ({ object: "activity", ...a })), url: `/api/v1/contacts/${contactId}/activities` } };
  },
  { scope: "contacts:read" }
);

const createActivitySchema = z.object({
  type: z.enum(["note", "call", "email", "meeting", "task_created", "event_linked", "lead_converted", "status_change", "other"]),
  title: z.string().min(1),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const POST = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const contactId = parseInt(params.id, 10);
    if (isNaN(contactId)) throw validationError("Invalid contact ID.", "id");
    await verifyContactAccess(contactId, session.organizationId);

    const body = await request.json();
    const parsed = createActivitySchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));

    const d = parsed.data;
    const [activity] = await db.insert(contactActivities).values({
      contactId,
      type: d.type,
      title: d.title,
      description: d.description,
      metadata: d.metadata,
    }).returning();

    return { status: 201, data: { object: "activity", ...activity } };
  },
  { scope: "contacts:write", idempotent: true }
);
