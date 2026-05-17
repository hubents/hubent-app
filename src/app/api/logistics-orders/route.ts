import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import {
  logisticsOrders,
  logisticsOrderItems,
  productCatalog,
  events,
} from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { apiHandler, ok, created, badRequest } from "@/lib/api-handler";

export async function GET(_request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();

    const rows = await db
      .select({
        id: logisticsOrders.id,
        organizationId: logisticsOrders.organizationId,
        eventId: logisticsOrders.eventId,
        eventName: logisticsOrders.eventName,
        clientName: logisticsOrders.clientName,
        clientEmail: logisticsOrders.clientEmail,
        clientPhone: logisticsOrders.clientPhone,
        date: logisticsOrders.date,
        linkedDocId: logisticsOrders.linkedDocId,
        linkedDocType: logisticsOrders.linkedDocType,
        status: logisticsOrders.status,
        notes: logisticsOrders.notes,
        createdAt: logisticsOrders.createdAt,
        updatedAt: logisticsOrders.updatedAt,
      })
      .from(logisticsOrders)
      .where(eq(logisticsOrders.organizationId, session.organizationId))
      .orderBy(desc(logisticsOrders.createdAt));

    const orderIds = rows.map((r) => r.id);
    let allItems: {
      id: number;
      orderId: number;
      productId: number | null;
      productName: string | null;
      quantity: number;
      description: string | null;
      hasService: boolean | null;
      serviceTitle: string | null;
      serviceTimeFrom: string | null;
      serviceTimeTo: string | null;
      serviceWorkerName: string | null;
      serviceWorkerId: string | null;
      serviceLocation: string | null;
      serviceNotes: string | null;
      agendaItemId: string | null;
      catalogProductName: string | null;
    }[] = [];

    if (orderIds.length > 0) {
      const itemRows = await db
        .select({
          id: logisticsOrderItems.id,
          orderId: logisticsOrderItems.orderId,
          productId: logisticsOrderItems.productId,
          productName: logisticsOrderItems.productName,
          quantity: logisticsOrderItems.quantity,
          description: logisticsOrderItems.description,
          hasService: logisticsOrderItems.hasService,
          serviceTitle: logisticsOrderItems.serviceTitle,
          serviceTimeFrom: logisticsOrderItems.serviceTimeFrom,
          serviceTimeTo: logisticsOrderItems.serviceTimeTo,
          serviceWorkerName: logisticsOrderItems.serviceWorkerName,
          serviceWorkerId: logisticsOrderItems.serviceWorkerId,
          serviceLocation: logisticsOrderItems.serviceLocation,
          serviceNotes: logisticsOrderItems.serviceNotes,
          agendaItemId: logisticsOrderItems.agendaItemId,
          catalogProductName: productCatalog.name,
        })
        .from(logisticsOrderItems)
        .leftJoin(
          productCatalog,
          eq(logisticsOrderItems.productId, productCatalog.id)
        )
        .where(inArray(logisticsOrderItems.orderId, orderIds));

      allItems = itemRows.filter((item) => orderIds.includes(item.orderId));
    }

    const itemsByOrder = new Map<number, typeof allItems>();
    for (const item of allItems) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    const result = rows.map((r) => ({
      ...r,
      items: (itemsByOrder.get(r.id) ?? []).map((item) => ({
        ...item,
        productName: item.productName ?? item.catalogProductName ?? "Producto eliminado",
      })),
    }));

    return ok(result);
  }, "GET /api/logistics-orders");
}

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();
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

    if (!eventName?.trim() && !clientName?.trim())
      return badRequest("Se requiere nombre de evento o cliente");

    // Resolve event name if eventId provided
    let resolvedEventName = eventName || null;
    if (eventId && !resolvedEventName) {
      const ev = await db.query.events.findFirst({
        where: (e, { eq, and }) =>
          and(
            eq(e.id, Number(eventId)),
            eq(e.organizationId, session.organizationId)
          ),
      });
      resolvedEventName = ev?.name || null;
    }

    const [order] = await db
      .insert(logisticsOrders)
      .values({
        organizationId: session.organizationId,
        eventId: eventId ? Number(eventId) : null,
        eventName: resolvedEventName,
        clientName: clientName || null,
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null,
        date: date || null,
        linkedDocId: linkedDocId || null,
        linkedDocType: linkedDocType || null,
        status: status || "borrador",
        notes: notes || null,
      })
      .returning();

    const createdItems: unknown[] = [];
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (!item.productId && !item.productName) continue;

        // Resolve product name from catalog if not provided
        let resolvedProductName = item.productName || null;
        if (item.productId && !resolvedProductName) {
          const prod = await db.query.productCatalog.findFirst({
            where: (p, { eq }) => eq(p.id, Number(item.productId)),
          });
          resolvedProductName = prod?.name || null;
        }

        const [createdItem] = await db
          .insert(logisticsOrderItems)
          .values({
            orderId: order.id,
            productId: item.productId ? Number(item.productId) : null,
            productName: resolvedProductName,
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
          })
          .returning();
        createdItems.push(createdItem);
      }
    }

    return created({ ...order, items: createdItems });
  }, "POST /api/logistics-orders");
}
