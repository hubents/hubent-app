import { NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/session";
import { db } from "@/db";
import { organizations, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendProviderVerifiedEmail, sendProviderRejectedEmail } from "@/lib/email";
import { getConfigByDbOrgType } from "@/lib/tenant-type";
import { apiHandler, ok, badRequest, notFound } from "@/lib/api-handler";

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
  return apiHandler(async () => {
    const session = await requirePlatformAdmin();
    const { id } = await params;
    const orgId = parseInt(id);

    if (isNaN(orgId)) {
      return badRequest("Invalid organization ID", "INVALID_ID");
    }

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const { action, rejectionReason } = parsed.data;

    const provider = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    if (!provider) {
      return notFound("Organization not found");
    }

    // Any orgType visible in Partners can be verified (not just providers)
    const typeConfig = getConfigByDbOrgType(provider.orgType || "");
    if (!typeConfig?.isMarketplaceVisible) {
      return badRequest(`Organization type '${provider.orgType}' is not visible in Partners`, "NOT_VERIFIABLE");
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

      return ok({ status: "verified" });
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

      return ok({ status: "rejected" });
    }
  }, "POST /api/admin/providers/[id]/verify");
}
