import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { organizations, organizationPortfolio } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  eventType: z.string().optional().or(z.literal("")),
  sortOrder: z.number().min(0).optional(),
});

/**
 * PATCH /api/vendor/portfolio/[id]
 * Update a portfolio item
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const itemId = parseInt(id);

    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Invalid portfolio item ID" } },
        { status: 400 }
      );
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
      columns: { orgType: true },
    });

    if (!org || org.orgType !== "provider") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Not a provider organization" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updates: Record<string, unknown> = {};
    if (data.title !== undefined) updates.title = data.title || null;
    if (data.description !== undefined) updates.description = data.description || null;
    if (data.eventType !== undefined) updates.eventType = data.eventType || null;
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;

    const [updated] = await db
      .update(organizationPortfolio)
      .set(updates)
      .where(
        and(
          eq(organizationPortfolio.id, itemId),
          eq(organizationPortfolio.organizationId, session.organizationId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Portfolio item not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/vendor/portfolio/[id] error:", error);
    const message = error instanceof Error ? error.message : "Failed to update portfolio item";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status }
    );
  }
}

/**
 * DELETE /api/vendor/portfolio/[id]
 * Delete a portfolio item
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const itemId = parseInt(id);

    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Invalid portfolio item ID" } },
        { status: 400 }
      );
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
      columns: { orgType: true },
    });

    if (!org || org.orgType !== "provider") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Not a provider organization" } },
        { status: 403 }
      );
    }

    const [deleted] = await db
      .delete(organizationPortfolio)
      .where(
        and(
          eq(organizationPortfolio.id, itemId),
          eq(organizationPortfolio.organizationId, session.organizationId)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Portfolio item not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("DELETE /api/vendor/portfolio/[id] error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete portfolio item";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status }
    );
  }
}
