import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { productCatalog } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const GET = withApiAuth(
  async (_request: NextRequest, { session }) => {
    const products = await db.select().from(productCatalog)
      .where(eq(productCatalog.organizationId, session.organizationId))
      .orderBy(desc(productCatalog.createdAt));

    return { data: { object: "list", data: products.map((p) => ({ object: "product", ...p })), url: "/api/v1/finance/products" } };
  },
  { scope: "finance:read" }
);
