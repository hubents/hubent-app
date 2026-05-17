import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { productCatalog, warehouses } from "@/db/schema";
import { eq, and, ilike, or, asc } from "drizzle-orm";
import { apiHandler, ok, created, badRequest } from "@/lib/api-handler";

export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const type = searchParams.get("type") || "";
    const category = searchParams.get("category") || "";

    const conditions = [eq(productCatalog.organizationId, session.organizationId)];

    if (type && type !== "todos") {
      conditions.push(eq(productCatalog.type, type as "fisico" | "servicio" | "paquete"));
    }
    if (category && category !== "Todas") {
      conditions.push(eq(productCatalog.category, category));
    }
    if (q.trim()) {
      conditions.push(
        or(
          ilike(productCatalog.name, `%${q}%`),
          ilike(productCatalog.sku, `%${q}%`),
          ilike(productCatalog.category, `%${q}%`)
        )!
      );
    }

    const products = await db
      .select({
        id: productCatalog.id,
        organizationId: productCatalog.organizationId,
        sku: productCatalog.sku,
        name: productCatalog.name,
        type: productCatalog.type,
        subtype: productCatalog.subtype,
        category: productCatalog.category,
        tags: productCatalog.tags,
        description: productCatalog.description,
        detail: productCatalog.detail,
        cost: productCatalog.cost,
        unitPrice: productCatalog.unitPrice,
        taxRate: productCatalog.taxRate,
        unit: productCatalog.unit,
        stock: productCatalog.stock,
        stockMin: productCatalog.stockMin,
        warehouseId: productCatalog.warehouseId,
        warehouseName: warehouses.name,
        color: productCatalog.color,
        initials: productCatalog.initials,
        imageUrl: productCatalog.imageUrl,
        isActive: productCatalog.isActive,
        createdAt: productCatalog.createdAt,
        updatedAt: productCatalog.updatedAt,
      })
      .from(productCatalog)
      .leftJoin(warehouses, eq(productCatalog.warehouseId, warehouses.id))
      .where(and(...conditions))
      .orderBy(asc(productCatalog.name));

    return ok(products);
  }, "GET /api/products");
}

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const body = await request.json();

    const {
      name, sku, type, subtype, category, tags, description, detail,
      cost, unitPrice, taxRate, stock, stockMin, warehouseId,
      color, initials, imageUrl,
    } = body;

    if (!name?.trim()) return badRequest("name es obligatorio");

    const initials_ = initials || name.split(" ").filter(Boolean).map((w: string) => w[0].toUpperCase()).slice(0, 2).join("");

    const [product] = await db.insert(productCatalog).values({
      organizationId: session.organizationId,
      sku: sku || null,
      name: name.trim(),
      type: type || "fisico",
      subtype: subtype || "venta",
      category: category || null,
      tags: tags || [],
      description: description || null,
      detail: detail || null,
      cost: cost != null ? String(cost) : null,
      unitPrice: unitPrice != null ? String(unitPrice) : null,
      taxRate: taxRate != null ? String(taxRate) : "21",
      stock: type === "servicio" ? null : (stock != null ? Number(stock) : null),
      stockMin: type === "servicio" ? null : (stockMin != null ? Number(stockMin) : null),
      warehouseId: warehouseId || null,
      color: color || "#7B8FA1",
      initials: initials_,
      imageUrl: imageUrl || null,
    }).returning();

    return created(product);
  }, "POST /api/products");
}
