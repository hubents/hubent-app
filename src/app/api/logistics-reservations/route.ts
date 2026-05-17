import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import {
  logisticsReservations,
  logisticsReservationItems,
  productCatalog,
  warehouses,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { apiHandler, ok, created, badRequest } from "@/lib/api-handler";

export async function GET(_request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();

    // Fetch all reservations for this organization
    const rows = await db
      .select({
        id: logisticsReservations.id,
        organizationId: logisticsReservations.organizationId,
        eventId: logisticsReservations.eventId,
        eventName: logisticsReservations.eventName,
        date: logisticsReservations.date,
        timeFrom: logisticsReservations.timeFrom,
        timeTo: logisticsReservations.timeTo,
        warehouseId: logisticsReservations.warehouseId,
        warehouseName: logisticsReservations.warehouseName,
        itemsLocation: logisticsReservations.itemsLocation,
        venue: logisticsReservations.venue,
        venueCity: logisticsReservations.venueCity,
        status: logisticsReservations.status,
        notes: logisticsReservations.notes,
        createdAt: logisticsReservations.createdAt,
        updatedAt: logisticsReservations.updatedAt,
        // warehouse details
        warehouseColor: warehouses.color,
        warehouseType: warehouses.type,
      })
      .from(logisticsReservations)
      .leftJoin(
        warehouses,
        eq(logisticsReservations.warehouseId, warehouses.id)
      )
      .where(
        eq(logisticsReservations.organizationId, session.organizationId)
      )
      .orderBy(desc(logisticsReservations.createdAt));

    // Fetch all items for each reservation
    const reservationIds = rows.map((r) => r.id);

    let allItems: {
      id: number;
      reservationId: number;
      productId: number;
      productName: string;
      productColor: string | null;
      productInitials: string | null;
      quantity: number;
      notes: string | null;
    }[] = [];

    if (reservationIds.length > 0) {
      const itemRows = await db
        .select({
          id: logisticsReservationItems.id,
          reservationId: logisticsReservationItems.reservationId,
          productId: logisticsReservationItems.productId,
          productName: productCatalog.name,
          productColor: productCatalog.color,
          productInitials: productCatalog.initials,
          quantity: logisticsReservationItems.quantity,
          notes: logisticsReservationItems.notes,
        })
        .from(logisticsReservationItems)
        .leftJoin(
          productCatalog,
          eq(logisticsReservationItems.productId, productCatalog.id)
        )
        .where(
          eq(
            logisticsReservationItems.reservationId,
            // Use a subquery-friendly approach: fetch all items and filter in JS
            logisticsReservationItems.reservationId
          )
        );

      // Filter to only items belonging to our reservations
      allItems = itemRows
        .filter((item) => reservationIds.includes(item.reservationId))
        .map((item) => ({
          ...item,
          productName: item.productName ?? "Producto eliminado",
        }));
    }

    // Group items by reservationId
    const itemsByReservation = new Map<number, typeof allItems>();
    for (const item of allItems) {
      const list = itemsByReservation.get(item.reservationId) ?? [];
      list.push(item);
      itemsByReservation.set(item.reservationId, list);
    }

    const result = rows.map((r) => ({
      ...r,
      items: itemsByReservation.get(r.id) ?? [],
    }));

    return ok(result);
  }, "GET /api/logistics-reservations");
}

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();
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
      items, // Array of { productId, quantity, notes }
    } = body;

    if (!eventName?.trim()) return badRequest("eventName es obligatorio");

    // Resolve warehouse name if not provided but warehouseId is
    let resolvedWarehouseName = warehouseName || null;
    if (warehouseId && !resolvedWarehouseName) {
      const wh = await db.query.warehouses.findFirst({
        where: (w, { eq, and }) =>
          and(
            eq(w.id, Number(warehouseId)),
            eq(w.organizationId, session.organizationId)
          ),
      });
      resolvedWarehouseName = wh?.name || null;
    }

    const [reservation] = await db
      .insert(logisticsReservations)
      .values({
        organizationId: session.organizationId,
        eventId: eventId ? Number(eventId) : null,
        eventName: eventName.trim(),
        date: date || null,
        timeFrom: timeFrom || null,
        timeTo: timeTo || null,
        warehouseId: warehouseId ? Number(warehouseId) : null,
        warehouseName: resolvedWarehouseName,
        itemsLocation: itemsLocation || null,
        venue: venue || null,
        venueCity: venueCity || null,
        status: status || "pendiente",
        notes: notes || null,
      })
      .returning();

    // Insert items if provided
    const createdItems: unknown[] = [];
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (!item.productId || !item.quantity) continue;
        const [createdItem] = await db
          .insert(logisticsReservationItems)
          .values({
            reservationId: reservation.id,
            productId: Number(item.productId),
            quantity: Number(item.quantity),
            notes: item.notes || null,
          })
          .returning();
        createdItems.push(createdItem);
      }
    }

    return created({ ...reservation, items: createdItems });
  }, "POST /api/logistics-reservations");
}
