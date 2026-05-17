import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/session";
import { sendPasswordResetEmail } from "@/lib/email";
import { apiHandler, ok, notFound } from "@/lib/api-handler";

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

    const token = crypto.randomUUID();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    await db.insert(verificationTokens).values({
      identifier: `reset:${user.email}`,
      token,
      expires,
    });

    const resetUrl = `${getAppUrl()}/auth/reset-password?token=${token}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    return ok({ message: "Email de recuperación enviado" });
  }, "POST /api/admin/users/[id]/reset-password");
}
