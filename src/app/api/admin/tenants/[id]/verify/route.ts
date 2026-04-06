import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/session";
import { db } from "@/db";
import { organizations, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendProviderVerifiedEmail, sendProviderRejectedEmail } from "@/lib/email";
import { getConfigByDbOrgType } from "@/lib/tenant-type";

type RouteParams = { params: Promise<{ id: string }> };

const verifySchema = z
  .object({
    action: z.enum(["verify", "reject"]),
    rejectionReason: z.string().optional(),
  })
  .refine(
    (data) =>
      data.action !== "reject" ||
      (data.rejectionReason && data.rejectionReason.trim().length > 0),
    { message: "Motivo de rechazo es requerido", path: ["rejectionReason"] }
  );

/**
 * POST /api/admin/tenants/[id]/verify
 * Verify or reject any organization visible in Partners (planner, provider, venue, etc.).
 * Gated by isMarketplaceVisible in tenant-types config, not hardcoded orgType checks.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePlatformAdmin();
    const { id } = await params;
    const orgId = parseInt(id);

    if (isNaN(orgId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "ID de organización inválido" } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      );
    }

    const { action, rejectionReason } = parsed.data;

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Organización no encontrada" } },
        { status: 404 }
      );
    }

    // Only org types visible in Partners (isMarketplaceVisible) can be verified
    const typeConfig = getConfigByDbOrgType(org.orgType || "");
    if (!typeConfig?.isMarketplaceVisible) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_VERIFIABLE",
            message: `El tipo de organización '${org.orgType}' no es visible en Partners y no puede ser verificado`,
          },
        },
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
      if (org.ownerId) {
        db.query.users
          .findFirst({ where: eq(users.id, org.ownerId) })
          .then((owner) => {
            if (owner?.email) {
              sendProviderVerifiedEmail(
                owner.email,
                owner.name || org.name,
                org.name
              ).catch((e) => console.error("Failed to send verified email:", e));
            }
          });
      }

      return NextResponse.json({ success: true, data: { status: "verified" } });
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
      if (org.ownerId) {
        db.query.users
          .findFirst({ where: eq(users.id, org.ownerId) })
          .then((owner) => {
            if (owner?.email) {
              sendProviderRejectedEmail(
                owner.email,
                owner.name || org.name,
                org.name,
                rejectionReason || "No cumple los requisitos"
              ).catch((e) => console.error("Failed to send rejected email:", e));
            }
          });
      }

      return NextResponse.json({ success: true, data: { status: "rejected" } });
    }
  } catch (error) {
    console.error("POST /api/admin/tenants/[id]/verify error:", error);
    const message = error instanceof Error ? error.message : "Error en verificación";
    const status =
      message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "VERIFY_ERROR", message } },
      { status }
    );
  }
}
