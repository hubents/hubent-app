import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { logisticsOrders, logisticsOrderItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, ok, notFound, badRequest } from "@/lib/api-handler";

type Params = { params: Promise<{ id: string }> };

async function findOrder(id: number, organizationId: number) {
  return db.query.logisticsOrders.findFirst({
    where: (o, { eq, and }) =>
      and(eq(o.id, id), eq(o.organizationId, organizationId)),
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest("ID inválido");

    const order = await findOrder(id, session.organizationId);
    if (!order) return notFound("Orden no encontrada");

    const body = await request.json();
    const {
      eventId,
      eventName,
      clientName,
      clientEmail,
      clientPhone,
      date,
      linkedDocId,
      linkedDocType,
      status,
      notes,
      items,
    } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (eventId !== undefined) updateData.eventId = eventId ? Number(eventId) : null;
    if (eventName !== undefined) updateData.eventName = eventName;
    if (clientName !== undefined) updateData.clientName = clientName;
    if (clientEmail !== undefined) updateData.clientEmail = clientEmail;
    if (clientPhone !== undefined) updateData.clientPhone = clientPhone;
    if (date !== undefined) updateData.date = date;
    if (linkedDocId !== undefined) updateData.linkedDocId = linkedDocId;
    if (linkedDocType !== undefined) updateData.linkedDocType = linkedDocType;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const [updated] = await db
      .update(logisticsOrders)
      .set(updateData)
      .where(
        and(
          eq(logisticsOrders.id, id),
          eq(logisticsOrders.organizationId, session.organizationId)
        )
      )
      .returning();

    if (Array.isArray(items)) {
      await db
        .delete(logisticsOrderItems)
        .where(eq(logisticsOrderItems.orderId, id));

      for (const item of items) {
        if (!item.productId && !item.productName) continue;
        await db.insert(logisticsOrderItems).values({
          orderId: id,
          productId: item.productId ? Number(item.productId) : null,
          productName: item.productName || null,
          quantity: Number(item.quantity) || 1,
          description: item.description || null,
          hasService: item.hasService || false,
          serviceTitle: item.serviceTitle || null,
          serviceTimeFrom: item.serviceTimeFrom || null,
          serviceTimeTo: item.serviceTimeTo || null,
          serviceWorkerName: item.serviceWorkerName || null,
          serviceWorkerId: item.serviceWorkerId || null,
          serviceLocation: item.serviceLocation || null,
          serviceNotes: item.serviceNotes || null,
          agendaItemId: item.agendaItemId || null,
        });
      }
    }

    return ok(updated);
  }, "PATCH /api/logistics-orders/[id]");
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest("ID inválido");

    const order = await findOrder(id, session.organizationId);
    if (!order) return notFound("Orden no encontrada");

    await db
      .delete(logisticsOrders)
      .where(
        and(
          eq(logisticsOrders.id, id),
          eq(logisticsOrders.organizationId, session.organizationId)
        )
      );

    return ok({ message: "Orden eliminada" });
  }, "DELETE /api/logistics-orders/[id]");
}
