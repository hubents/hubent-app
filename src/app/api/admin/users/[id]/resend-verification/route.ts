import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/session";
import { sendVerificationEmail } from "@/lib/email";
import { apiHandler, ok, notFound, badRequest } from "@/lib/api-handler";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://app.hubents.com";
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requirePlatformAdmin();

    const { id } = await params;

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return notFound("Usuario no encontrado");
    }

    if (user.emailVerified) {
      return badRequest("El usuario ya está verificado");
    }

    const token = crypto.randomUUID();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    await db.insert(verificationTokens).values({
      identifier: user.email,
      token,
      expires,
    });

    const verifyUrl = `${getAppUrl()}/auth/verify?token=${token}`;

    await sendVerificationEmail(user.email, verifyUrl);

    return ok({ message: "Email de verificación enviado" });
  }, "POST /api/admin/users/[id]/resend-verification");
}
