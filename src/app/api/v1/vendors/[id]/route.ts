import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { vendors } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFoundError, validationError } from "@/lib/api/api-errors";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid vendor ID.", "id");

    const [vendor] = await db.select().from(vendors)
      .where(and(eq(vendors.id, id), eq(vendors.organizationId, session.organizationId))).limit(1);

    if (!vendor) throw notFoundError("Vendor", params.id);
    return { data: { object: "vendor", ...vendor } };
  },
  { scope: "vendors:read" }
);

export const PATCH = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid vendor ID.", "id");

    const body = await request.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.website !== undefined) updateData.website = body.website;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.rating !== undefined) updateData.rating = body.rating;

    const [updated] = await db.update(vendors).set(updateData)
      .where(and(eq(vendors.id, id), eq(vendors.organizationId, session.organizationId))).returning();

    if (!updated) throw notFoundError("Vendor", params.id);

    void dispatchWebhookEvent(session.organizationId, "vendor.updated", { ...updated }).catch(() => {});

    return { data: { object: "vendor", ...updated } };
  },
  { scope: "vendors:write", idempotent: true }
);

export const DELETE = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid vendor ID.", "id");

    const [deleted] = await db.delete(vendors)
      .where(and(eq(vendors.id, id), eq(vendors.organizationId, session.organizationId)))
      .returning({ id: vendors.id });

    if (!deleted) throw notFoundError("Vendor", params.id);

    void dispatchWebhookEvent(session.organizationId, "vendor.deleted", { id: deleted.id }).catch(() => {});

    return { data: { object: "vendor", id: deleted.id, deleted: true } };
  },
  { scope: "vendors:write" }
);
