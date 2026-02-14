import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/session";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

const verifySchema = z.object({
  action: z.enum(["verify", "reject"]),
  rejectionReason: z.string().optional(),
}).refine(
  (data) => data.action !== "reject" || (data.rejectionReason && data.rejectionReason.trim().length > 0),
  { message: "Motivo de rechazo es requerido", path: ["rejectionReason"] }
);

/**
 * POST /api/admin/providers/[id]/verify
 * Verify or reject a provider organization
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePlatformAdmin();
    const { id } = await params;
    const providerId = parseInt(id);

    if (isNaN(providerId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Invalid provider ID" } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const { action, rejectionReason } = parsed.data;

    // Check provider exists and is a provider org
    const provider = await db.query.organizations.findFirst({
      where: eq(organizations.id, providerId),
    });

    if (!provider || provider.orgType !== "provider") {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Provider not found" } },
        { status: 404 }
      );
    }

    if (action === "verify") {
      await db
        .update(organizations)
        .set({
          verificationStatus: "verified",
          verifiedAt: new Date(),
          verifiedBy: session.user.userId,
          rejectionReason: null,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, providerId));

      return NextResponse.json({
        success: true,
        data: { status: "verified" },
      });
    } else {
      await db
        .update(organizations)
        .set({
          verificationStatus: "rejected",
          rejectionReason: rejectionReason || "No cumple los requisitos",
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, providerId));

      return NextResponse.json({
        success: true,
        data: { status: "rejected" },
      });
    }
  } catch (error) {
    console.error("POST /api/admin/providers/[id]/verify error:", error);
    const message = error instanceof Error ? error.message : "Verification failed";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "VERIFY_ERROR", message } },
      { status }
    );
  }
}
