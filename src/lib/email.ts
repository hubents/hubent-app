import { Resend } from "resend";

// Lazy initialization to avoid build-time errors
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY || process.env.resend;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const FROM_EMAIL = process.env.EMAIL_FROM || "HubEnts <noreply@hubents.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://hubents.com";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error(error.message);
    }

    console.log(`Email sent to ${to}: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Send email error:", error);
    return { success: false, error };
  }
}

// ============================================
// WELCOME EMAIL
// ============================================

export async function sendWelcomeEmail(
  to: string,
  name: string,
  companyName: string,
  trialEndsAt: Date
) {
  const trialEndDate = trialEndsAt.toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🎉 ¡Bienvenido a HubEnts!
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">
                Hola <strong>${name}</strong>,
              </p>
              
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">
                Tu cuenta para <strong>${companyName}</strong> ha sido creada exitosamente. 
                Estamos emocionados de tenerte con nosotros.
              </p>
              
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <p style="margin: 0; font-size: 14px; color: #166534;">
                  🎁 <strong>Tu prueba gratuita de 7 días</strong> está activa hasta el ${trialEndDate}.
                  Tienes acceso completo a todas las funcionalidades.
                </p>
              </div>
              
              <p style="margin: 0 0 30px; font-size: 16px; color: #374151;">
                ¿Listo para comenzar? Completa tu configuración inicial:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}/onboarding?welcome=true" 
                       style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Comenzar configuración
                    </a>
                  </td>
                </tr>
              </table>
              
              <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 15px; font-size: 14px; color: #6b7280;">
                  <strong>¿Qué puedes hacer con HubEnts?</strong>
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #6b7280;">
                  <li style="margin-bottom: 8px;">📅 Gestionar eventos y cronogramas</li>
                  <li style="margin-bottom: 8px;">👥 Administrar invitados y RSVP</li>
                  <li style="margin-bottom: 8px;">🏪 Coordinar proveedores</li>
                  <li style="margin-bottom: 8px;">💰 Controlar presupuestos y pagos</li>
                  <li style="margin-bottom: 8px;">✅ Asignar tareas a tu equipo</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                ¿Necesitas ayuda? Responde a este email o visita nuestro centro de ayuda.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} HubEnts. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to,
    subject: `🎉 Bienvenido a HubEnts, ${name}!`,
    html,
    text: `Hola ${name}, tu cuenta para ${companyName} ha sido creada. Tu prueba gratuita está activa hasta el ${trialEndDate}. Visita ${APP_URL}/onboarding para comenzar.`,
  });
}

// ============================================
// ORGANIZATION INVITATION EMAIL
// ============================================

export async function sendOrganizationInviteEmail(
  to: string,
  organizationName: string,
  roleName: string,
  inviterName: string | null,
  inviteUrl: string
) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                👋 Te han invitado a un equipo
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">
                ${inviterName ? `<strong>${inviterName}</strong> te ha invitado` : "Has sido invitado"} 
                a unirte a <strong>${organizationName}</strong> en HubEnts.
              </p>
              
              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
                <p style="margin: 0 0 5px; font-size: 14px; color: #6b7280;">Tu rol será:</p>
                <p style="margin: 0; font-size: 20px; font-weight: 600; color: #7c3aed;">${roleName}</p>
              </div>
              
              <p style="margin: 0 0 30px; font-size: 16px; color: #374151;">
                Haz clic en el botón para aceptar la invitación y unirte al equipo:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Aceptar invitación
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; font-size: 14px; color: #9ca3af; text-align: center;">
                Esta invitación expira en 7 días.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                Si no esperabas esta invitación, puedes ignorar este email.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} HubEnts. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to,
    subject: `👋 ${inviterName || "Alguien"} te invitó a ${organizationName}`,
    html,
    text: `Has sido invitado a unirte a ${organizationName} como ${roleName}. Acepta la invitación aquí: ${inviteUrl}`,
  });
}

// ============================================
// ADMIN INVITATION EMAIL
// ============================================

export async function sendAdminInviteEmail(
  to: string,
  level: string,
  inviterName: string | null,
  inviteUrl: string
) {
  const levelLabel = level === "super_admin" ? "Super Administrador" : "Soporte";
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1e293b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🛡️ Invitación de Administrador
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #e2e8f0;">
                ${inviterName ? `<strong>${inviterName}</strong> te ha invitado` : "Has sido invitado"} 
                a unirte al equipo de administración de <strong>HubEnts</strong>.
              </p>
              
              <div style="background-color: #1e293b; border: 1px solid #475569; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
                <p style="margin: 0 0 5px; font-size: 14px; color: #94a3b8;">Nivel de acceso:</p>
                <p style="margin: 0; font-size: 20px; font-weight: 600; color: #ef4444;">${levelLabel}</p>
              </div>
              
              <div style="background-color: #422006; border: 1px solid #854d0e; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #fbbf24;">
                  ⚠️ <strong>Acceso privilegiado:</strong> Este rol te dará acceso al panel de administración de la plataforma.
                </p>
              </div>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Aceptar invitación
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; font-size: 14px; color: #64748b; text-align: center;">
                Esta invitación expira en 7 días.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; border-top: 1px solid #334155; padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #64748b;">
                Si no esperabas esta invitación, por favor ignórala y contacta al equipo de HubEnts.
              </p>
              <p style="margin: 0; font-size: 12px; color: #475569;">
                © ${new Date().getFullYear()} HubEnts Platform Administration
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to,
    subject: `🛡️ Invitación de Administrador - HubEnts`,
    html,
    text: `Has sido invitado como ${levelLabel} de HubEnts. Acepta la invitación aquí: ${inviteUrl}`,
  });
}

// ============================================
// PASSWORD RESET EMAIL
// ============================================

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🔐 Restablecer contraseña
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en HubEnts.
              </p>
              
              <p style="margin: 0 0 30px; font-size: 16px; color: #374151;">
                Haz clic en el botón para crear una nueva contraseña:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Restablecer contraseña
                    </a>
                  </td>
                </tr>
              </table>
              
              <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin: 30px 0;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  ⏰ Este enlace expira en <strong>1 hora</strong> por seguridad.
                </p>
              </div>
              
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                Si no solicitaste este cambio, puedes ignorar este email. Tu contraseña no será modificada.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                ¿Problemas con el botón? Copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 0 0 20px; font-size: 12px; color: #9ca3af; word-break: break-all;">
                ${resetUrl}
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} HubEnts. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to,
    subject: `🔐 Restablecer tu contraseña - HubEnts`,
    html,
    text: `Recibimos una solicitud para restablecer tu contraseña. Visita este enlace para crear una nueva: ${resetUrl}. El enlace expira en 1 hora.`,
  });
}
