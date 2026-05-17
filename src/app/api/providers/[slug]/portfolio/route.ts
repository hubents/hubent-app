import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { organizations, orgPortfolio } from "@/db/schema";
import { eq, and, asc, or } from "drizzle-orm";
import { apiHandler, ok, created, badRequest, notFound } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ slug: string }> };

async function resolveOrgBySlug(slug: string) {
  return db.query.organizations.findFirst({
    where: and(
      eq(organizations.slug, slug),
      or(
        eq(organizations.orgType, "provider"),
        eq(organizations.orgType, "tenant")
      )
    ),
    columns: { id: true },
  });
}

/**
 * GET /api/providers/[slug]/portfolio
 * Public — returns portfolio items for the org, ordered by sortOrder ASC.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { slug } = await params;

    const org = await resolveOrgBySlug(slug);
    if (!org) return notFound("Provider not found");

    const items = await db
      .select()
      .from(orgPortfolio)
      .where(eq(orgPortfolio.organizationId, org.id))
      .orderBy(asc(orgPortfolio.sortOrder));

    return ok({ items });
  }, "GET /api/providers/[slug]/portfolio");
}

/**
 * POST /api/providers/[slug]/portfolio
 * Authenticated — only the owner org can add portfolio items.
 * Body: { url, thumbnail?, title?, description?, eventType? }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { slug } = await params;

    const org = await resolveOrgBySlug(slug);
    if (!org) return notFound("Provider not found");

    if (session.organizationId !== org.id) {
      return badRequest("No tienes permiso para modificar este portfolio");
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("Body inválido");

    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!url) return badRequest("El campo url es obligatorio");

    const [item] = await db
      .insert(orgPortfolio)
      .values({
        organizationId: org.id,
        url,
        thumbnail: body.thumbnail ? String(body.thumbnail).trim() : null,
        title: body.title ? String(body.title).trim() : null,
        description: body.description ? String(body.description).trim() : null,
        eventType: body.eventType ? String(body.eventType).trim() : null,
      })
      .returning();

    return created(item);
  }, "POST /api/providers/[slug]/portfolio");
}

/**
 * DELETE /api/providers/[slug]/portfolio
 * Authenticated — only the owner org can delete portfolio items.
 * Body or searchParam: { id: number }
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { slug } = await params;

    const org = await resolveOrgBySlug(slug);
    if (!org) return notFound("Provider not found");

    if (session.organizationId !== org.id) {
      return badRequest("No tienes permiso para modificar este portfolio");
    }

    // Accept id from body or query param
    let itemId: number | null = null;
    const { searchParams } = request.nextUrl;
    const qpId = searchParams.get("id");
    if (qpId) {
      itemId = parseInt(qpId, 10);
    } else {
      const body = await request.json().catch(() => null);
      if (body && typeof body.id === "number") itemId = body.id;
    }

    if (!itemId || isNaN(itemId)) return badRequest("id es obligatorio");

    const deleted = await db
      .delete(orgPortfolio)
      .where(
        and(
          eq(orgPortfolio.id, itemId),
          eq(orgPortfolio.organizationId, org.id)
        )
      )
      .returning({ id: orgPortfolio.id });

    if (deleted.length === 0) return notFound("Item no encontrado");

    return ok({ deleted: true, id: itemId });
  }, "DELETE /api/providers/[slug]/portfolio");
}
