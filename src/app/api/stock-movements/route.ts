import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import {
  stockMovements,
  productCatalog,
  productWarehouseStock,
  warehouses,
} from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { apiHandler, ok, created, badRequest } from "@/lib/api-handler";

// ─── Helpers de stock por almacén ─────────────────────────────────────────────

async function addWarehouseStock(
  orgId: number,
  productId: number,
  warehouseId: number,
  qty: number
) {
  await db
    .insert(productWarehouseStock)
    .values({ organizationId: orgId, productId, warehouseId, quantity: qty, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [productWarehouseStock.productId, productWarehouseStock.warehouseId],
      set: {
        quantity: sql`${productWarehouseStock.quantity} + ${qty}`,
        updatedAt: new Date(),
      },
    });
}

async function subtractWarehouseStock(
  productId: number,
  warehouseId: number,
  qty: number
) {
  await db
    .update(productWarehouseStock)
    .set({
      quantity: sql`GREATEST(0, ${productWarehouseStock.quantity} - ${qty})`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(productWarehouseStock.productId, productId),
        eq(productWarehouseStock.warehouseId, warehouseId)
      )
    );
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();

    const rows = await db
      .select({
        id: stockMovements.id,
        type: stockMovements.type,
        productId: stockMovements.productId,
        productName: productCatalog.name,
        quantity: stockMovements.quantity,
        date: stockMovements.date,
        warehouseId: stockMovements.warehouseId,
        warehouseName: warehouses.name,
        fromWarehouseId: stockMovements.fromWarehouseId,
        toWarehouseId: stockMovements.toWarehouseId,
        eventId: stockMovements.eventId,
        eventName: stockMovements.eventName,
        timeFrom: stockMovements.timeFrom,
        timeTo: stockMovements.timeTo,
        reference: stockMovements.reference,
        notes: stockMovements.notes,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .leftJoin(productCatalog, eq(stockMovements.productId, productCatalog.id))
      .leftJoin(warehouses, eq(stockMovements.warehouseId, warehouses.id))
      .where(eq(stockMovements.organizationId, session.organizationId))
      .orderBy(desc(stockMovements.createdAt));

    return ok(rows);
  }, "GET /api/stock-movements");
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const body = await request.json();
    const {
      type, productId, quantity, date, warehouseId,
      fromWarehouseId, toWarehouseId, eventId, eventName,
      timeFrom, timeTo, reference, notes,
    } = body;

    if (!type) return badRequest("type es obligatorio");
    if (!productId) return badRequest("productId es obligatorio");
    if (!quantity || quantity < 1) return badRequest("quantity debe ser mayor que 0");

    const pid  = Number(productId);
    const qty  = Number(quantity);
    const wid  = warehouseId    ? Number(warehouseId)    : null;
    const fwid = fromWarehouseId ? Number(fromWarehouseId) : null;
    const twid = toWarehouseId   ? Number(toWarehouseId)   : null;

    // Validaciones según tipo
    if ((type === "transferencia" || type === "carga") && (!fwid || !twid)) {
      return badRequest("transferencia y carga requieren fromWarehouseId y toWarehouseId");
    }
    if (["entrada", "salida", "devolucion", "ajuste"].includes(type) && !wid) {
      return badRequest("Este tipo de movimiento requiere warehouseId");
    }

    // 1. Registrar el movimiento (auditoría)
    const [movement] = await db.insert(stockMovements).values({
      organizationId: session.organizationId,
      type,
      productId: pid,
      quantity: qty,
      date: date || new Date().toISOString().slice(0, 10),
      warehouseId:     wid,
      fromWarehouseId: fwid,
      toWarehouseId:   twid,
      eventId:   eventId   ? Number(eventId) : null,
      eventName: eventName || null,
      timeFrom:  timeFrom  || null,
      timeTo:    timeTo    || null,
      reference: reference || null,
      notes:     notes     || null,
    }).returning();

    // 2. Actualizar stock según tipo
    switch (type) {
      case "entrada":
      case "devolucion":
        // Material entra a un almacén (compra, devolución de cliente)
        await addWarehouseStock(session.organizationId, pid, wid!, qty);
        await db
          .update(productCatalog)
          .set({ stock: sql`COALESCE(${productCatalog.stock}, 0) + ${qty}` })
          .where(eq(productCatalog.id, pid));
        break;

      case "salida":
        // Material sale permanentemente (venta, pérdida)
        await subtractWarehouseStock(pid, wid!, qty);
        await db
          .update(productCatalog)
          .set({ stock: sql`GREATEST(0, COALESCE(${productCatalog.stock}, 0) - ${qty})` })
          .where(eq(productCatalog.id, pid));
        break;

      case "transferencia":
      case "carga":
        // Movimiento físico entre almacenes (incluye cargar furgoneta)
        // El total de stock no cambia, solo la distribución
        await subtractWarehouseStock(pid, fwid!, qty);
        await addWarehouseStock(session.organizationId, pid, twid!, qty);
        break;

      case "ajuste": {
        // Corrección manual: se establece la cantidad final en el almacén
        // Calcula la diferencia con el stock actual y actualiza el total
        const existing = await db.query.productWarehouseStock.findFirst({
          where: (r, { and: a, eq: e }) =>
            a(e(r.productId, pid), e(r.warehouseId, wid!)),
        });
        const diff = qty - (existing?.quantity ?? 0);
        await db
          .insert(productWarehouseStock)
          .values({ organizationId: session.organizationId, productId: pid, warehouseId: wid!, quantity: qty, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: [productWarehouseStock.productId, productWarehouseStock.warehouseId],
            set: { quantity: qty, updatedAt: new Date() },
          });
        if (diff !== 0) {
          await db
            .update(productCatalog)
            .set({ stock: sql`GREATEST(0, COALESCE(${productCatalog.stock}, 0) + ${diff})` })
            .where(eq(productCatalog.id, pid));
        }
        break;
      }

      // reserva y entrega no modifican stock físico (el bloqueo es lógico)
      case "reserva":
      case "entrega":
      default:
        break;
    }

    return created(movement);
  }, "POST /api/stock-movements");
}
