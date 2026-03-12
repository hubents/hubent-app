import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notFoundError, validationError } from "@/lib/api/api-errors";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid contact ID.", "id");

    const [contact] = await db.select().from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.organizationId, session.organizationId), isNull(contacts.deletedAt)))
      .limit(1);

    if (!contact) throw notFoundError("Contact", params.id);
    return { data: { object: "contact", ...contact } };
  },
  { scope: "contacts:read" }
);

export const PATCH = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid contact ID.", "id");

    const body = await request.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.first_name !== undefined) updateData.firstName = body.first_name;
    if (body.last_name !== undefined) updateData.lastName = body.last_name;
    if (body.trade_name !== undefined) updateData.tradeName = body.trade_name;
    if (body.tax_id !== undefined) updateData.taxId = body.tax_id;
    if (body.website !== undefined) updateData.website = body.website;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.state !== undefined) updateData.state = body.state;
    if (body.postal_code !== undefined) updateData.postalCode = body.postal_code;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.source !== undefined) updateData.source = body.source;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.is_vendor !== undefined) updateData.isVendor = body.is_vendor;
    if (body.vendor_category !== undefined) updateData.vendorCategory = body.vendor_category;
    if (body.category !== undefined) updateData.category = body.category;

    const [updated] = await db.update(contacts).set(updateData)
      .where(and(eq(contacts.id, id), eq(contacts.organizationId, session.organizationId), isNull(contacts.deletedAt)))
      .returning();

    if (!updated) throw notFoundError("Contact", params.id);

    void dispatchWebhookEvent(session.organizationId, "contact.updated", { ...updated }).catch(() => {});

    return { data: { object: "contact", ...updated } };
  },
  { scope: "contacts:write", idempotent: true }
);

export const DELETE = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid contact ID.", "id");

    const [deleted] = await db.update(contacts).set({ deletedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.organizationId, session.organizationId), isNull(contacts.deletedAt)))
      .returning({ id: contacts.id });

    if (!deleted) throw notFoundError("Contact", params.id);

    void dispatchWebhookEvent(session.organizationId, "contact.deleted", { id: deleted.id }).catch(() => {});

    return { data: { object: "contact", id: deleted.id, deleted: true } };
  },
  { scope: "contacts:write" }
);
