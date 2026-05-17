import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import {
  logisticsReservations,
  logisticsReservationItems,
  productCatalog,
  productWarehouseStock,
  stockMovements,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { apiHandler, ok, notFound, badRequest } from "@/lib/api-handler";

type Params = { params: Promise<{ id: string }> };

async function findReservation(id: number, organizationId: number) {
  return db.query.logisticsReservations.findFirst({
    where: (r, { eq, and }) =>
      and(eq(r.id, id), eq(r.organizationId, organizationId)),
  });
}

// ─── Descuenta stock físico (solo para productos de venta) ────────────────────
async function applyDeliveryStockEffect(
  reservationId: number,
  organizationId: number,
  warehouseId: number | null,
  eventId: number | null,
  eventName: string | null,
  date: string | null
) {
  // Cargar ítems de la reserva con el subtipo del producto
  const items = await db
    .select({
      productId:   logisticsReservationItems.productId,
      productName: productCatalog.name,
      quantity:    logisticsReservationItems.quantity,
      subtype:     productCatalog.subtype,
    })
    .from(logisticsReservationItems)
    .leftJoin(productCatalog, eq(logisticsReservationItems.productId, productCatalog.id))
    .where(eq(logisticsReservationItems.reservationId, reservationId));

  const today = date || new Date().toISOString().slice(0, 10);

  for (const item of items) {
    // Solo afecta a productos de VENTA (no alquiler — estos se bloquean pero no se descuentan)
    if (item.subtype !== "venta") continue;

    const pid = item.productId;
    const qty = item.quantity;

    // Descontar del almacén asignado a la reserva (furgoneta o almacén origen)
    if (warehouseId) {
      await db
        .update(productWarehouseStock)
        .set({
          quantity: sql`GREATEST(0, ${productWarehouseStock.quantity} - ${qty})`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(productWarehouseStock.productId, pid),
            eq(productWarehouseStock.warehouseId, warehouseId)
          )
        );
    }

    // Descontar del total en product_catalog
    await db
      .update(productCatalog)
      .set({ stock: sql`GREATEST(0, COALESCE(${productCatalog.stock}, 0) - ${qty})` })
      .where(eq(productCatalog.id, pid));

    // Registrar el movimiento de salida para auditoría
    await db.insert(stockMovements).values({
      organizationId,
      type: "salida",
      productId: pid,
      quantity: qty,
      date: today,
      warehouseId: warehouseId ?? null,
      eventId:    eventId ?? null,
      eventName:  eventName ?? null,
      notes: `Entrega definitiva (venta) — reserva #${reservationId}`,
    });
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest("ID inválido");

    const reservation = await findReservation(id, session.organizationId);
    if (!reservation) return notFound("Reserva no encontrada");

    const body = await request.json();
    const {
      eventId,
      eventName,
      date,
      timeFrom,
      timeTo,
      warehouseId,
      warehouseName,
      itemsLocation,
      venue,
      venueCity,
      status,
      notes,
      items,
    } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (eventId     !== undefined) updateData.eventId     = eventId ? Number(eventId) : null;
    if (eventName   !== undefined) updateData.eventName   = eventName;
    if (date        !== undefined) updateData.date        = date;
    if (timeFrom    !== undefined) updateData.timeFrom    = timeFrom;
    if (timeTo      !== undefined) updateData.timeTo      = timeTo;
    if (warehouseId !== undefined) updateData.warehouseId = warehouseId ? Number(warehouseId) : null;
    if (warehouseName  !== undefined) updateData.warehouseName  = warehouseName;
    if (itemsLocation  !== undefined) updateData.itemsLocation  = itemsLocation;
    if (venue       !== undefined) updateData.venue       = venue;
    if (venueCity   !== undefined) updateData.venueCity   = venueCity;
    if (status      !== undefined) updateData.status      = status;
    if (notes       !== undefined) updateData.notes       = notes;

    const [updated] = await db
      .update(logisticsReservations)
      .set(updateData)
      .where(
        and(
          eq(logisticsReservations.id, id),
          eq(logisticsReservations.organizationId, session.organizationId)
        )
      )
      .returning();

    // Reemplazar ítems si se proporcionan
    if (Array.isArray(items)) {
      await db
        .delete(logisticsReservationItems)
        .where(eq(logisticsReservationItems.reservationId, id));

      for (const item of items) {
        if (!item.productId || !item.quantity) continue;
        await db.insert(logisticsReservationItems).values({
          reservationId: id,
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          notes: item.notes || null,
        });
      }
    }

    // ── Efecto de stock al cambiar estado ────────────────────────────────────
    if (status && status !== reservation.status) {
      const resolvedWarehouseId =
        warehouseId !== undefined
          ? (warehouseId ? Number(warehouseId) : null)
          : reservation.warehouseId;

      if (status === "entregada") {
        // Solo para productos de venta: descuento permanente de stock
        await applyDeliveryStockEffect(
          id,
          session.organizationId,
          resolvedWarehouseId,
          updated.eventId ?? null,
          updated.eventName ?? null,
          updated.date ?? null
        );
      }
      // Para alquiler (la mayoría): el stock se "bloquea" para esa fecha
      // pero no se descuenta nunca físicamente. La disponibilidad se calcula
      // restando las reservas activas (pendiente/confirmada/en_ruta) de la fecha.
    }

    return ok(updated);
  }, "PATCH /api/logistics-reservations/[id]");
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest("ID inválido");

    const reservation = await findReservation(id, session.organizationId);
    if (!reservation) return notFound("Reserva no encontrada");

    await db
      .delete(logisticsReservations)
      .where(
        and(
          eq(logisticsReservations.id, id),
          eq(logisticsReservations.organizationId, session.organizationId)
        )
      );

    return ok({ message: "Reserva eliminada" });
  }, "DELETE /api/logistics-reservations/[id]");
}
