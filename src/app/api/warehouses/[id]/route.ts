import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { warehouses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, ok, notFound, badRequest } from "@/lib/api-handler";

type Params = { params: Promise<{ id: string }> };

async function findWarehouse(id: number, organizationId: number) {
  return db.query.warehouses.findFirst({
    where: (w, { eq, and }) => and(eq(w.id, id), eq(w.organizationId, organizationId)),
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest("ID inválido");

    const warehouse = await findWarehouse(id, session.organizationId);
    if (!warehouse) return notFound("Almacén no encontrado");

    const body = await request.json();
    const { name, type, location, capacity, manager, plate, driver, color, initials, isActive, eventId, eventName } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (location !== undefined) updateData.location = location;
    if (capacity !== undefined) updateData.capacity = capacity != null ? Number(capacity) : null;
    if (manager !== undefined) updateData.manager = manager;
    if (plate !== undefined) updateData.plate = plate;
    if (driver !== undefined) updateData.driver = driver;
    if (color !== undefined) updateData.color = color;
    if (initials !== undefined) updateData.initials = initials;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (eventId !== undefined) updateData.eventId = eventId;
    if (eventName !== undefined) updateData.eventName = eventName;

    const [updated] = await db.update(warehouses)
      .set(updateData)
      .where(and(eq(warehouses.id, id), eq(warehouses.organizationId, session.organizationId)))
      .returning();

    return ok(updated);
  }, "PATCH /api/warehouses/[id]");
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest("ID inválido");

    const warehouse = await findWarehouse(id, session.organizationId);
    if (!warehouse) return notFound("Almacén no encontrado");

    await db.delete(warehouses)
      .where(and(eq(warehouses.id, id), eq(warehouses.organizationId, session.organizationId)));

    return ok({ message: "Almacén eliminado" });
  }, "DELETE /api/warehouses/[id]");
}
