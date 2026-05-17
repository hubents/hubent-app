import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { productCatalog } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, ok, notFound, badRequest } from "@/lib/api-handler";

type Params = { params: Promise<{ id: string }> };

async function findProduct(id: number, organizationId: number) {
  return db.query.productCatalog.findFirst({
    where: (p, { eq, and }) => and(eq(p.id, id), eq(p.organizationId, organizationId)),
  });
}

export async function GET(_req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest("ID inválido");

    const product = await findProduct(id, session.organizationId);
    if (!product) return notFound("Producto no encontrado");

    return ok(product);
  }, "GET /api/products/[id]");
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest("ID inválido");

    const product = await findProduct(id, session.organizationId);
    if (!product) return notFound("Producto no encontrado");

    const body = await request.json();
    const {
      name, sku, type, subtype, category, tags, description, detail,
      cost, unitPrice, taxRate, stock, stockMin, warehouseId,
      color, initials, imageUrl, isActive,
    } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (sku !== undefined) updateData.sku = sku;
    if (type !== undefined) updateData.type = type;
    if (subtype !== undefined) updateData.subtype = subtype;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (description !== undefined) updateData.description = description;
    if (detail !== undefined) updateData.detail = detail;
    if (cost !== undefined) updateData.cost = cost != null ? String(cost) : null;
    if (unitPrice !== undefined) updateData.unitPrice = unitPrice != null ? String(unitPrice) : null;
    if (taxRate !== undefined) updateData.taxRate = taxRate != null ? String(taxRate) : null;
    if (stock !== undefined) updateData.stock = stock != null ? Number(stock) : null;
    if (stockMin !== undefined) updateData.stockMin = stockMin != null ? Number(stockMin) : null;
    if (warehouseId !== undefined) updateData.warehouseId = warehouseId;
    if (color !== undefined) updateData.color = color;
    if (initials !== undefined) updateData.initials = initials;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db.update(productCatalog)
      .set(updateData)
      .where(and(eq(productCatalog.id, id), eq(productCatalog.organizationId, session.organizationId)))
      .returning();

    return ok(updated);
  }, "PATCH /api/products/[id]");
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest("ID inválido");

    const product = await findProduct(id, session.organizationId);
    if (!product) return notFound("Producto no encontrado");

    await db.delete(productCatalog)
      .where(and(eq(productCatalog.id, id), eq(productCatalog.organizationId, session.organizationId)));

    return ok({ message: "Producto eliminado" });
  }, "DELETE /api/products/[id]");
}
