import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { warehouses } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { apiHandler, ok, created, badRequest } from "@/lib/api-handler";

export async function GET(_request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();

    const rows = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.organizationId, session.organizationId))
      .orderBy(asc(warehouses.name));

    return ok(rows);
  }, "GET /api/warehouses");
}

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const body = await request.json();
    const { name, type, location, capacity, manager, plate, driver, color, initials } = body;

    if (!name?.trim()) return badRequest("name es obligatorio");

    const initials_ = initials || name.split(" ").filter(Boolean).map((w: string) => w[0].toUpperCase()).slice(0, 2).join("");

    const [warehouse] = await db.insert(warehouses).values({
      organizationId: session.organizationId,
      name: name.trim(),
      type: type || "fijo",
      location: location || null,
      capacity: capacity ? Number(capacity) : null,
      manager: manager || null,
      plate: plate || null,
      driver: driver || null,
      color: color || "#4F7A5E",
      initials: initials_,
    }).returning();

    return created(warehouse);
  }, "POST /api/warehouses");
}
