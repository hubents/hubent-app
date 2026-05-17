import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);
}

/**
 * GET /api/organizations/check-slug?slug=xxx
 * Returns { available: boolean, suggestion?: string }
 */
export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const slug = request.nextUrl.searchParams.get("slug")?.trim() ?? "";

    if (!slug || slug.length < 2) return badRequest("Slug demasiado corto");

    const clean = slugify(slug);
    if (!clean) return badRequest("Slug inválido");

    const existing = await db.query.organizations.findFirst({
      where: and(
        eq(organizations.slug, clean),
        ne(organizations.id, session.organizationId)
      ),
    });

    if (!existing) return ok({ available: true, slug: clean });

    // Buscar el primer sufijo libre: slug-2, slug-3, …
    let suggestion = "";
    for (let i = 2; i <= 20; i++) {
      const candidate = `${clean}-${i}`;
      const conflict = await db.query.organizations.findFirst({
        where: and(
          eq(organizations.slug, candidate),
          ne(organizations.id, session.organizationId)
        ),
      });
      if (!conflict) { suggestion = candidate; break; }
    }

    return ok({ available: false, slug: clean, suggestion });
  }, "GET /api/organizations/check-slug");
}
