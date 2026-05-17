import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { organizations, users, organizationMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";
import {
  sendVerificationRequestConfirmEmail,
  sendVerificationRequestAdminEmail,
} from "@/lib/email";

export async function POST(_request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
    });

    if (!org) return badRequest("Organización no encontrada");

    if (org.verificationStatus === "verified") {
      return badRequest("Tu cuenta ya está verificada");
    }
    if (org.verificationStatus === "pending") {
      return badRequest("Ya tienes una solicitud de verificación en curso");
    }

    // Marcar como pendiente
    await db
      .update(organizations)
      .set({ verificationStatus: "pending" })
      .where(eq(organizations.id, org.id));

    // Obtener email del owner para el correo de confirmación
    const member = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, org.id),
          eq(organizationMembers.userId, session.user.userId)
        )
      )
      .limit(1);

    const ownerUser = member.length
      ? await db.query.users.findFirst({ where: eq(users.id, member[0].userId) })
      : null;

    const ownerEmail = ownerUser?.email ?? "";
    const ownerName = ownerUser?.name ?? org.name;

    // Emails en paralelo (fire-and-forget — no bloquea la respuesta)
    if (ownerEmail) {
      sendVerificationRequestConfirmEmail(ownerEmail, ownerName, org.name).catch((e) =>
        console.error("sendVerificationRequestConfirmEmail failed:", e)
      );
    }

    sendVerificationRequestAdminEmail(
      org.id,
      org.name,
      ownerEmail || org.publicEmail || "—",
      org.slug,
      org.orgType
    ).catch((e) => console.error("sendVerificationRequestAdminEmail failed:", e));

    return ok({ message: "Solicitud enviada correctamente" });
  }, "POST /api/organizations/request-verification");
}
