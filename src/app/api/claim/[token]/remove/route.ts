import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { partnerClaimTokens, vendors, contacts } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";

/**
 * GET /api/claim/[token]/remove
 * GDPR opt-out: marks the token as rejected and anonymizes the vendor contact.
 * Intentionally a GET so it works as a one-click link from email clients.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const claim = await db.query.partnerClaimTokens.findFirst({
    where: (c, { eq }) => eq(c.token, token),
  });

  if (!claim) {
    return new NextResponse(removePage("Enlace no válido", "Este enlace ya no existe o ha expirado."), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (claim.status === "claimed") {
    return new NextResponse(removePage("Perfil ya verificado", "Este perfil ya ha sido reclamado por su titular y no puede eliminarse desde este enlace."), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Mark all tokens for this email as rejected
  await db
    .update(partnerClaimTokens)
    .set({ status: "expired" })
    .where(ilike(partnerClaimTokens.email, claim.email));

  // Anonymize vendor records: remove email so they can't be re-identified
  await db
    .update(vendors)
    .set({ email: null })
    .where(ilike(vendors.email, claim.email));

  // Anonymize contact email too
  await db
    .update(contacts)
    .set({ email: null, updatedAt: new Date() })
    .where(eq(contacts.id, claim.contactId));

  return new NextResponse(removePage("Datos eliminados", "Hemos procesado tu solicitud. Tus datos de contacto han sido eliminados de Hubents conforme al RGPD. El perfil de empresa permanece en la plataforma sin información de contacto personal."), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function removePage(title: string, message: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · Hubents</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f9fafb; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #fff; border-radius: 12px; padding: 40px 32px; max-width: 460px; width: 100%; box-shadow: 0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.06); text-align: center; }
    h1 { font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 12px; }
    p { font-size: 15px; color: #6b7280; line-height: 1.6; margin: 0 0 24px; }
    a { display: inline-block; background: #111827; color: #fff; text-decoration: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://hubents.com">Volver a Hubents</a>
  </div>
</body>
</html>`;
}
