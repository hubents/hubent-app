import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/session";
import { db } from "@/db";
import { organizations, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendProviderVerifiedEmail, sendProviderRejectedEmail } from "@/lib/email";
import { getConfigByDbOrgType } from "@/lib/tenant-type";

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
 * Verify or reject any organization visible in Partners (provider, planner, venue, etc.).
 * Not restricted to orgType=provider -- any orgType that has isMarketplaceVisible=true
 * in tenant-types config can be verified.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePlatformAdmin();
    const { id } = await params;
    const orgId = parseInt(id);

    if (isNaN(orgId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Invalid organization ID" } },
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

    const provider = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    if (!provider) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Organization not found" } },
        { status: 404 }
      );
    }

    // Any orgType visible in Partners can be verified (not just providers)
    const typeConfig = getConfigByDbOrgType(provider.orgType || "");
    if (!typeConfig?.isMarketplaceVisible) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_VERIFIABLE", message: `Organization type '${provider.orgType}' is not visible in Partners` } },
        { status: 400 }
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
        .where(eq(organizations.id, orgId));

      // Send approval email (non-blocking)
      if (provider.ownerId) {
        db.query.users.findFirst({ where: eq(users.id, provider.ownerId) }).then((owner) => {
          if (owner?.email) {
            sendProviderVerifiedEmail(owner.email, owner.name || provider.name, provider.name).catch((e) =>
              console.error("Failed to send provider verified email:", e)
            );
          }
        });
      }

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
        .where(eq(organizations.id, orgId));

      // Send rejection email (non-blocking)
      if (provider.ownerId) {
        db.query.users.findFirst({ where: eq(users.id, provider.ownerId) }).then((owner) => {
          if (owner?.email) {
            sendProviderRejectedEmail(owner.email, owner.name || provider.name, provider.name, rejectionReason || "No cumple los requisitos").catch((e) =>
              console.error("Failed to send provider rejected email:", e)
            );
          }
        });
      }

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
