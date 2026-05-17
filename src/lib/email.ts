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

function getFromEmail() {
  return process.env.EMAIL_FROM || "Hubents <noreply@hubents.com>";
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://app.hubents.com";
}

function getSettingsUrl(orgType?: string) {
  const base = orgType === "provider" ? "vendor" : "dashboard";
  return `${getAppUrl()}/${base}/settings`;
}

function getLogoUrl() {
  return `${getAppUrl()}/images/logo.png`;
}

// ============================================
// BRAND COLORS (Minimalista)
// ============================================
const COLORS = {
  background: "#f9fafb",
  cardBg: "#ffffff",
  textPrimary: "#111827",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  accent: "#10b981",
  buttonBg: "#111827",
  buttonText: "#ffffff",
  warningBg: "#fffbeb",
  warningBorder: "#fcd34d",
  warningText: "#92400e",
  successBg: "#ecfdf5",
  successBorder: "#a7f3d0",
  successText: "#065f46",
};

// ============================================
// EMAIL TEMPLATE HELPERS
// ============================================
function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${COLORS.background}; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.background}; padding: 48px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.cardBg}; border-radius: 8px; overflow: hidden; border: 1px solid ${COLORS.border};">
          <!-- Logo Header -->
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid ${COLORS.border};">
              <img src="${getLogoUrl()}" alt="Hubents" height="36" style="display: block; margin: 0 auto; height: 36px;" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid ${COLORS.border}; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: ${COLORS.textMuted};">
                © ${new Date().getFullYear()} Hubents. Todos los derechos reservados.
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
}

function primaryButton(text: string, url: string): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
  <tr>
    <td align="center">
      <a href="${url}" 
         style="display: inline-block; background-color: ${COLORS.buttonBg}; color: ${COLORS.buttonText}; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 500; font-size: 14px;">
        ${text}
      </a>
    </td>
  </tr>
</table>
`;
}

function infoBox(content: string, type: "warning" | "success" = "warning"): string {
  const bg = type === "success" ? COLORS.successBg : COLORS.warningBg;
  const border = type === "success" ? COLORS.successBorder : COLORS.warningBorder;
  const text = type === "success" ? COLORS.successText : COLORS.warningText;
  
  return `
<div style="background-color: ${bg}; border: 1px solid ${border}; border-radius: 6px; padding: 14px 16px; margin: 24px 0;">
  <p style="margin: 0; font-size: 14px; color: ${text}; line-height: 1.5;">
    ${content}
  </p>
</div>
`;
}

function paragraph(text: string): string {
  return `<p style="margin: 0 0 16px; font-size: 15px; color: ${COLORS.textPrimary}; line-height: 1.6;">${text}</p>`;
}

function heading(text: string): string {
  return `<h2 style="margin: 0 0 20px; font-size: 22px; font-weight: 600; color: ${COLORS.textPrimary};">${text}</h2>`;
}

function mutedText(text: string): string {
  return `<p style="margin: 0; font-size: 13px; color: ${COLORS.textMuted}; text-align: center;">${text}</p>`;
}

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
      from: getFromEmail(),
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
  trialEndsAt: Date,
  trialDays: number = 14
) {
  const trialEndDate = trialEndsAt.toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const content = `
    ${heading("Bienvenido a Hubents")}
    ${paragraph(`Hola <strong>${name}</strong>,`)}
    ${paragraph(`Tu cuenta para <strong>${companyName}</strong> ha sido creada exitosamente.`)}
    ${infoBox(`<strong>Tu prueba gratuita de ${trialDays} días</strong> está activa hasta el ${trialEndDate}. Tienes acceso completo a todas las funcionalidades.`, "success")}
    ${paragraph("¿Listo para comenzar? Completa tu configuración inicial:")}
    ${primaryButton("Comenzar configuración", `${getAppUrl()}/onboarding?welcome=true`)}
    ${mutedText("¿Necesitas ayuda? Responde a este email.")}
  `;

  return sendEmail({
    to,
    subject: `Bienvenido a Hubents, ${name}`,
    html: emailWrapper(content),
    text: `Hola ${name}, tu cuenta para ${companyName} ha sido creada. Tu prueba gratuita de ${trialDays} días está activa hasta el ${trialEndDate}. Visita ${getAppUrl()}/onboarding para comenzar.`,
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
  const inviterText = inviterName 
    ? `<strong>${inviterName}</strong> te ha invitado` 
    : "Has sido invitado";

  const content = `
    ${heading("Te han invitado a un equipo")}
    ${paragraph(`${inviterText} a unirte a <strong>${organizationName}</strong> en Hubents.`)}
    <div style="background-color: ${COLORS.background}; border: 1px solid ${COLORS.border}; border-radius: 6px; padding: 16px; margin: 24px 0; text-align: center;">
      <p style="margin: 0 0 4px; font-size: 13px; color: ${COLORS.textSecondary};">Tu rol será:</p>
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${COLORS.textPrimary};">${roleName}</p>
    </div>
    ${paragraph("Haz clic en el botón para aceptar la invitación:")}
    ${primaryButton("Aceptar invitación", inviteUrl)}
    ${mutedText("Esta invitación expira en 7 días.")}
  `;

  return sendEmail({
    to,
    subject: `${inviterName || "Alguien"} te invitó a ${organizationName}`,
    html: emailWrapper(content),
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
  const inviterText = inviterName 
    ? `<strong>${inviterName}</strong> te ha invitado` 
    : "Has sido invitado";

  const content = `
    ${heading("Invitación de Administrador")}
    ${paragraph(`${inviterText} a unirte al equipo de administración de <strong>Hubents</strong>.`)}
    <div style="background-color: ${COLORS.background}; border: 1px solid ${COLORS.border}; border-radius: 6px; padding: 16px; margin: 24px 0; text-align: center;">
      <p style="margin: 0 0 4px; font-size: 13px; color: ${COLORS.textSecondary};">Nivel de acceso:</p>
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${COLORS.textPrimary};">${levelLabel}</p>
    </div>
    ${infoBox("<strong>Acceso privilegiado:</strong> Este rol te dará acceso al panel de administración de la plataforma.", "warning")}
    ${primaryButton("Aceptar invitación", inviteUrl)}
    ${mutedText("Esta invitación expira en 7 días.")}
  `;

  return sendEmail({
    to,
    subject: `Invitación de Administrador - Hubents`,
    html: emailWrapper(content),
    text: `Has sido invitado como ${levelLabel} de Hubents. Acepta la invitación aquí: ${inviteUrl}`,
  });
}

// ============================================
// TENANT WELCOME EMAIL (Admin creates tenant)
// ============================================

export async function sendTenantWelcomeEmail(
  to: string,
  ownerName: string,
  organizationName: string,
  tempPassword: string
) {
  const content = `
    ${heading("Tu cuenta está lista")}
    ${paragraph(`Hola <strong>${ownerName}</strong>,`)}
    ${paragraph(`Tu organización <strong>${organizationName}</strong> ha sido creada en Hubents.`)}
    <div style="background-color: ${COLORS.background}; border: 1px solid ${COLORS.border}; border-radius: 6px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 12px; font-size: 13px; color: ${COLORS.textSecondary}; font-weight: 500;">Tus credenciales de acceso:</p>
      <table style="width: 100%;">
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: ${COLORS.textSecondary};">Email:</td>
          <td style="padding: 6px 0; font-size: 14px; color: ${COLORS.textPrimary}; font-weight: 500;">${to}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: ${COLORS.textSecondary};">Contraseña:</td>
          <td style="padding: 6px 0; font-size: 14px; color: ${COLORS.textPrimary}; font-weight: 500; font-family: monospace;">${tempPassword}</td>
        </tr>
      </table>
    </div>
    ${infoBox("Por seguridad, te pediremos cambiar tu contraseña en el primer inicio de sesión.", "warning")}
    ${primaryButton("Iniciar sesión", `${getAppUrl()}/auth/login`)}
    ${mutedText("¿Necesitas ayuda? Responde a este email.")}
  `;

  return sendEmail({
    to,
    subject: `Tu cuenta en Hubents está lista - ${organizationName}`,
    html: emailWrapper(content),
    text: `Hola ${ownerName}, tu organización ${organizationName} ha sido creada en Hubents. Tus credenciales: Email: ${to}, Contraseña temporal: ${tempPassword}. Inicia sesión en ${getAppUrl()}/auth/login`,
  });
}

// ============================================
// PASSWORD RESET EMAIL
// ============================================

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
) {
  const content = `
    ${heading("Restablecer contraseña")}
    ${paragraph("Recibimos una solicitud para restablecer la contraseña de tu cuenta en Hubents.")}
    ${paragraph("Haz clic en el botón para crear una nueva contraseña:")}
    ${primaryButton("Restablecer contraseña", resetUrl)}
    ${infoBox("Este enlace expira en <strong>1 hora</strong> por seguridad.", "warning")}
    <p style="margin: 24px 0 0; font-size: 14px; color: ${COLORS.textSecondary};">
      Si no solicitaste este cambio, puedes ignorar este email.
    </p>
    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid ${COLORS.border};">
      <p style="margin: 0 0 8px; font-size: 13px; color: ${COLORS.textMuted};">
        ¿Problemas con el botón? Copia y pega este enlace:
      </p>
      <p style="margin: 0; font-size: 12px; color: ${COLORS.textMuted}; word-break: break-all;">
        ${resetUrl}
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Restablecer tu contraseña - Hubents`,
    html: emailWrapper(content),
    text: `Recibimos una solicitud para restablecer tu contraseña. Visita este enlace para crear una nueva: ${resetUrl}. El enlace expira en 1 hora.`,
  });
}

// ============================================
// EMAIL VERIFICATION EMAIL
// ============================================

export async function sendVerificationEmail(
  to: string,
  verifyUrl: string
) {
  const content = `
    ${heading("Verifica tu email")}
    ${paragraph("Necesitamos verificar tu dirección de email para completar tu cuenta en Hubents.")}
    ${paragraph("Haz clic en el botón para verificar tu email:")}
    ${primaryButton("Verificar email", verifyUrl)}
    ${infoBox("Este enlace expira en <strong>24 horas</strong> por seguridad.", "warning")}
    <p style="margin: 24px 0 0; font-size: 14px; color: ${COLORS.textSecondary};">
      Si no creaste una cuenta, puedes ignorar este email.
    </p>
    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid ${COLORS.border};">
      <p style="margin: 0 0 8px; font-size: 13px; color: ${COLORS.textMuted};">
        ¿Problemas con el botón? Copia y pega este enlace:
      </p>
      <p style="margin: 0; font-size: 12px; color: ${COLORS.textMuted}; word-break: break-all;">
        ${verifyUrl}
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Verifica tu email - Hubents`,
    html: emailWrapper(content),
    text: `Verifica tu dirección de email visitando este enlace: ${verifyUrl}. El enlace expira en 24 horas.`,
  });
}

// ============================================
// CONTACT TASK NOTIFICATION EMAIL
// ============================================

export async function sendContactTaskNotificationEmail(
  to: string,
  contactName: string,
  taskTitle: string,
  organizationName: string,
  addedByName: string
) {
  const content = `
    ${heading("Has sido agregado a una tarea")}
    ${paragraph(`Hola <strong>${contactName}</strong>,`)}
    ${paragraph(`<strong>${addedByName}</strong> de <strong>${organizationName}</strong> te ha agregado como participante en la siguiente tarea:`)}
    <div style="background: ${COLORS.successBg}; border: 1px solid ${COLORS.successBorder}; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.textPrimary};">
        📋 ${taskTitle}
      </p>
    </div>
    ${paragraph("Podrás recibir actualizaciones sobre el progreso de esta tarea.")}
    ${mutedText("Este es un mensaje automático de Hubents.")}
  `;

  return sendEmail({
    to,
    subject: `Te han agregado a una tarea: ${taskTitle}`,
    html: emailWrapper(content),
    text: `Hola ${contactName}, ${addedByName} de ${organizationName} te ha agregado como participante en la tarea: ${taskTitle}.`,
  });
}

// ============================================
// PROVIDER: WELCOME AFTER REGISTRATION
// ============================================

export async function sendProviderWelcomeEmail(
  to: string,
  ownerName: string,
  companyName: string
) {
  const content = `
    ${heading("Bienvenido a Hubents")}
    ${paragraph(`Hola <strong>${ownerName}</strong>,`)}
    ${paragraph(`Tu empresa <strong>${companyName}</strong> ha sido registrada como proveedor en la plataforma Hubents.`)}
    ${infoBox("Tu cuenta está <strong>pendiente de verificación</strong>. Nuestro equipo revisará tu perfil y te notificaremos cuando esté aprobada.", "warning")}
    ${paragraph("Mientras tanto, puedes completar tu perfil para agilizar el proceso:")}
    ${primaryButton("Completar mi perfil", `${getAppUrl()}/vendor/profile`)}
    ${mutedText("Recibirás un email cuando tu cuenta sea verificada.")}
  `;

  return sendEmail({
    to,
    subject: `Bienvenido a Hubents, ${ownerName}`,
    html: emailWrapper(content),
    text: `Hola ${ownerName}, tu empresa ${companyName} ha sido registrada como proveedor en Hubents. Tu cuenta está pendiente de verificación. Completa tu perfil en ${getAppUrl()}/vendor/profile`,
  });
}

// ============================================
// PROVIDER: VERIFICATION APPROVED
// ============================================

export async function sendProviderVerifiedEmail(
  to: string,
  ownerName: string,
  companyName: string
) {
  const content = `
    ${heading("¡Tu cuenta ha sido verificada!")}
    ${paragraph(`Hola <strong>${ownerName}</strong>,`)}
    ${infoBox(`<strong>${companyName}</strong> ha sido verificada exitosamente. Ya apareces en el directorio de proveedores y los planners pueden invitarte a sus eventos.`, "success")}
    ${paragraph("¿Qué puedes hacer ahora?")}
    <ul style="margin: 0 0 16px; padding-left: 20px; font-size: 15px; color: ${COLORS.textPrimary}; line-height: 1.8;">
      <li>Recibir invitaciones a eventos</li>
      <li>Gestionar tareas asignadas</li>
      <li>Emitir presupuestos y facturas</li>
      <li>Administrar tu equipo</li>
    </ul>
    ${primaryButton("Ir a mi panel", `${getAppUrl()}/vendor`)}
    ${mutedText("¿Necesitas ayuda? Responde a este email.")}
  `;

  return sendEmail({
    to,
    subject: `✅ ${companyName} verificada en Hubents`,
    html: emailWrapper(content),
    text: `Hola ${ownerName}, tu empresa ${companyName} ha sido verificada en Hubents. Ya puedes recibir invitaciones a eventos. Accede a tu panel en ${getAppUrl()}/vendor`,
  });
}

// ============================================
// PROVIDER: VERIFICATION REJECTED
// ============================================

export async function sendProviderRejectedEmail(
  to: string,
  ownerName: string,
  companyName: string,
  rejectionReason: string
) {
  const content = `
    ${heading("Verificación no aprobada")}
    ${paragraph(`Hola <strong>${ownerName}</strong>,`)}
    ${paragraph(`Lamentamos informarte que la verificación de <strong>${companyName}</strong> no ha sido aprobada en este momento.`)}
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 14px 16px; margin: 24px 0;">
      <p style="margin: 0 0 4px; font-size: 13px; color: #991b1b; font-weight: 500;">Motivo:</p>
      <p style="margin: 0; font-size: 14px; color: #991b1b; line-height: 1.5;">${rejectionReason}</p>
    </div>
    ${paragraph("Puedes actualizar tu perfil y solicitar una nueva revisión:")}
    ${primaryButton("Actualizar perfil", `${getAppUrl()}/vendor/profile`)}
    ${mutedText("Si crees que es un error, responde a este email.")}
  `;

  return sendEmail({
    to,
    subject: `Verificación pendiente - ${companyName}`,
    html: emailWrapper(content),
    text: `Hola ${ownerName}, la verificación de ${companyName} no ha sido aprobada. Motivo: ${rejectionReason}. Actualiza tu perfil en ${getAppUrl()}/vendor/profile`,
  });
}

// ============================================
// PROVIDER: EVENT INVITATION
// ============================================

export async function sendProviderEventInvitationEmail(
  to: string,
  providerName: string,
  eventName: string,
  eventDate: string | null,
  plannerOrgName: string
) {
  const dateText = eventDate
    ? new Date(eventDate).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })
    : "Fecha por confirmar";

  const content = `
    ${heading("Invitación a evento")}
    ${paragraph(`Hola <strong>${providerName}</strong>,`)}
    ${paragraph(`<strong>${plannerOrgName}</strong> te ha invitado a participar como proveedor en un evento:`)}
    <div style="background-color: ${COLORS.background}; border: 1px solid ${COLORS.border}; border-radius: 6px; padding: 16px; margin: 24px 0; text-align: center;">
      <p style="margin: 0 0 4px; font-size: 18px; font-weight: 600; color: ${COLORS.textPrimary};">${eventName}</p>
      <p style="margin: 0; font-size: 14px; color: ${COLORS.textSecondary};">📅 ${dateText}</p>
    </div>
    ${paragraph("Accede a tu portal para aceptar o rechazar la invitación:")}
    ${primaryButton("Ver invitación", `${getAppUrl()}/vendor/events`)}
    ${mutedText("Este es un mensaje automático de Hubents.")}
  `;

  return sendEmail({
    to,
    subject: `Invitación a evento: ${eventName}`,
    html: emailWrapper(content),
    text: `Hola ${providerName}, ${plannerOrgName} te ha invitado al evento "${eventName}" (${dateText}). Accede a ${getAppUrl()}/vendor/events para responder.`,
  });
}

// ============================================
// SUBSCRIPTION LIFECYCLE EMAILS
// ============================================

export async function sendTrialExpiringEmail(
  to: string,
  orgName: string,
  daysLeft: number,
  planName: string,
  orgType?: string
) {
  const settingsUrl = getSettingsUrl(orgType);
  const content = `
    ${heading("Tu prueba gratuita está por terminar")}
    ${paragraph(`Hola equipo de <strong>${orgName}</strong>,`)}
    ${infoBox(`Tu prueba del plan <strong>${planName}</strong> finaliza en <strong>${daysLeft} día${daysLeft > 1 ? "s" : ""}</strong>.`)}
    ${paragraph("Para seguir disfrutando de todas las funcionalidades, suscríbete a un plan antes de que termine tu prueba.")}
    ${paragraph("El precio se mostrará en tu moneda local al momento de pagar.")}
    ${primaryButton("Elegir mi plan", `${settingsUrl}?billing=upgrade`)}
    ${mutedText("Si tienes alguna pregunta, responde a este email.")}
  `;

  return sendEmail({
    to,
    subject: `⏰ Tu prueba gratuita termina en ${daysLeft} día${daysLeft > 1 ? "s" : ""} — ${orgName}`,
    html: emailWrapper(content),
    text: `Hola ${orgName}, tu prueba del plan ${planName} termina en ${daysLeft} días. Suscríbete en ${settingsUrl}`,
  });
}

export async function sendTrialExpiredEmail(
  to: string,
  orgName: string,
  planName: string,
  orgType?: string
) {
  const settingsUrl = getSettingsUrl(orgType);
  const content = `
    ${heading("Tu prueba gratuita ha terminado")}
    ${paragraph(`Hola equipo de <strong>${orgName}</strong>,`)}
    ${infoBox("Tu período de prueba ha finalizado. Tu cuenta ahora tiene acceso limitado en modo lectura.")}
    ${paragraph("Para recuperar el acceso completo a todas las funcionalidades, elige un plan:")}
    ${primaryButton("Suscribirse ahora", `${settingsUrl}?billing=upgrade`)}
    ${paragraph("Tus datos están seguros y no se eliminarán. Puedes reactivar tu cuenta en cualquier momento.")}
    ${mutedText("Si necesitas ayuda, responde a este email.")}
  `;

  return sendEmail({
    to,
    subject: `Tu prueba de Hubents ha terminado — ${orgName}`,
    html: emailWrapper(content),
    text: `Hola ${orgName}, tu prueba del plan ${planName} ha terminado. Suscríbete en ${settingsUrl}`,
  });
}

export async function sendPaymentFailedEmail(
  to: string,
  orgName: string,
  planName: string,
  orgType?: string
) {
  const settingsUrl = getSettingsUrl(orgType);
  const content = `
    ${heading("Problema con tu pago")}
    ${paragraph(`Hola equipo de <strong>${orgName}</strong>,`)}
    ${infoBox("No pudimos procesar el pago de tu suscripción al plan <strong>" + planName + "</strong>.")}
    ${paragraph("Por favor, actualiza tu método de pago para evitar la suspensión de tu cuenta:")}
    ${primaryButton("Actualizar método de pago", `${settingsUrl}?billing=update-payment`)}
    ${paragraph("Si crees que esto es un error, contacta a tu banco o responde a este email.")}
    ${mutedText("Stripe reintentará el cobro automáticamente en los próximos días.")}
  `;

  return sendEmail({
    to,
    subject: `⚠️ Problema con el pago de tu suscripción — ${orgName}`,
    html: emailWrapper(content),
    text: `Hola ${orgName}, no pudimos procesar el pago de tu plan ${planName}. Actualiza tu método de pago en ${settingsUrl}`,
  });
}

export async function sendSubscriptionCanceledEmail(
  to: string,
  orgName: string,
  planName: string,
  orgType?: string
) {
  const settingsUrl = getSettingsUrl(orgType);
  const content = `
    ${heading("Tu suscripción ha sido cancelada")}
    ${paragraph(`Hola equipo de <strong>${orgName}</strong>,`)}
    ${paragraph(`Tu suscripción al plan <strong>${planName}</strong> ha sido cancelada.`)}
    ${paragraph("Tu cuenta seguirá activa hasta el final del período facturado. Después, pasará a modo lectura.")}
    ${paragraph("¿Cambiaste de opinión? Puedes reactivar tu suscripción en cualquier momento:")}
    ${primaryButton("Reactivar suscripción", `${settingsUrl}?billing=upgrade`)}
    ${mutedText("Nos encantaría saber cómo mejorar. Responde a este email con tu feedback.")}
  `;

  return sendEmail({
    to,
    subject: `Tu suscripción de Hubents ha sido cancelada — ${orgName}`,
    html: emailWrapper(content),
    text: `Hola ${orgName}, tu suscripción al plan ${planName} ha sido cancelada. Reactívala en ${settingsUrl}`,
  });
}

export async function sendWinBackEmail(
  to: string,
  orgName: string,
  orgType?: string
) {
  const settingsUrl = getSettingsUrl(orgType);
  const content = `
    ${heading("Te extrañamos en Hubents")}
    ${paragraph(`Hola equipo de <strong>${orgName}</strong>,`)}
    ${paragraph("Hace unos días que tu prueba gratuita terminó y queremos asegurarnos de que no te pierdas todo lo que Hubents puede ofrecer.")}
    ${infoBox("🎁 <strong>Oferta especial:</strong> Suscríbete hoy y obtén un descuento en tu primer mes.", "success")}
    ${paragraph("Con Hubents puedes gestionar eventos, contactos, finanzas y mucho más desde una sola plataforma.")}
    ${primaryButton("Volver a Hubents", `${settingsUrl}?billing=upgrade`)}
    ${mutedText("Si ya no deseas recibir estos emails, responde con 'cancelar'.")}
  `;

  return sendEmail({
    to,
    subject: `Te extrañamos — Vuelve a Hubents, ${orgName}`,
    html: emailWrapper(content),
    text: `Hola ${orgName}, te extrañamos en Hubents. Suscríbete en ${settingsUrl}`,
  });
}

export async function sendTrialRenewedEmail(
  to: string,
  ownerName: string,
  orgName: string,
  planName: string,
  trialDays: number,
  trialEndsAt: Date,
  orgType?: string
) {
  const settingsUrl = getSettingsUrl(orgType);
  const dashboardUrl = orgType === "provider" ? `${getAppUrl()}/vendor` : `${getAppUrl()}/dashboard`;
  const trialEndDate = trialEndsAt.toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const content = `
    ${heading("Tu prueba gratuita ha sido renovada")}
    ${paragraph(`Hola <strong>${ownerName}</strong>,`)}
    ${paragraph(`Buenas noticias para <strong>${orgName}</strong>: hemos renovado tu período de prueba gratuita.`)}
    ${infoBox(`Tienes <strong>${trialDays} días más</strong> para explorar todas las funcionalidades de tu plan <strong>${planName}</strong>. Tu prueba vence el <strong>${trialEndDate}</strong>.`, "success")}
    ${paragraph("Durante este período tienes acceso completo a todas las herramientas de tu plan. Aprovecha para:")}
    ${paragraph("• Crear y gestionar tus eventos<br>• Organizar contactos y proveedores<br>• Administrar finanzas y pagos<br>• Colaborar con tu equipo")}
    ${primaryButton("Acceder a mi cuenta", dashboardUrl)}
    ${paragraph("Cuando estés listo, puedes elegir un plan de pago desde tu configuración para no perder el acceso.")}
    ${mutedText("¿Tienes preguntas? Responde a este email y te ayudamos.")}
  `;

  return sendEmail({
    to,
    subject: `Buenas noticias — Tu prueba gratuita fue renovada, ${orgName}`,
    html: emailWrapper(content),
    text: `Hola ${ownerName}, hemos renovado tu prueba gratuita del plan ${planName} en ${orgName}. Tienes ${trialDays} días más hasta el ${trialEndDate}. Accede en ${dashboardUrl}`,
  });
}

export async function sendPlansAvailableEmail(
  to: string,
  ownerName: string,
  orgName: string,
  wasTrialing: boolean,
  orgType?: string
) {
  const settingsUrl = getSettingsUrl(orgType);
  const isProvider = orgType === "provider";

  const introText = wasTrialing
    ? `Tu período de prueba en <strong>${orgName}</strong> ha finalizado. Tu cuenta ha pasado al plan <strong>Free</strong>, pero toda tu información está segura.`
    : `Tenemos novedades para <strong>${orgName}</strong> en Hubents.`;

  const tenantPlansTable = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border: 1px solid ${COLORS.border}; border-radius: 8px; overflow: hidden;">
      <tr style="background-color: ${COLORS.background};">
        <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: ${COLORS.textSecondary}; border-bottom: 1px solid ${COLORS.border};">Plan</td>
        <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: ${COLORS.textSecondary}; border-bottom: 1px solid ${COLORS.border}; text-align: center;">Mensual</td>
        <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: ${COLORS.textSecondary}; border-bottom: 1px solid ${COLORS.border}; text-align: center;">Anual</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textPrimary}; border-bottom: 1px solid ${COLORS.border};"><strong>Starter</strong></td>
        <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textPrimary}; text-align: center; border-bottom: 1px solid ${COLORS.border};">€14,50/mes</td>
        <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textPrimary}; text-align: center; border-bottom: 1px solid ${COLORS.border};">€145/año</td>
      </tr>
      <tr style="background-color: ${COLORS.successBg};">
        <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textPrimary}; border-bottom: 1px solid ${COLORS.border};"><strong>Standard</strong> ⭐</td>
        <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textPrimary}; text-align: center; border-bottom: 1px solid ${COLORS.border};">€29,50/mes</td>
        <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textPrimary}; text-align: center; border-bottom: 1px solid ${COLORS.border};">€295/año</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textPrimary};"><strong>Agency</strong></td>
        <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textPrimary}; text-align: center;">€49,50/mes</td>
        <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textPrimary}; text-align: center;">€495/año</td>
      </tr>
    </table>`;

  const providerPlansTable = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border: 1px solid ${COLORS.border}; border-radius: 8px; overflow: hidden;">
      <tr style="background-color: ${COLORS.background};">
        <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: ${COLORS.textSecondary}; border-bottom: 1px solid ${COLORS.border};">Plan</td>
        <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: ${COLORS.textSecondary}; border-bottom: 1px solid ${COLORS.border}; text-align: center;">Precio</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textPrimary}; border-bottom: 1px solid ${COLORS.border};"><strong>Free</strong></td>
        <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textPrimary}; text-align: center; border-bottom: 1px solid ${COLORS.border};">Gratis</td>
      </tr>
      <tr style="background-color: ${COLORS.successBg};">
        <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textPrimary};"><strong>Pro</strong> ⭐</td>
        <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textPrimary}; text-align: center;">€9,90/mes</td>
      </tr>
    </table>`;

  const plansTable = isProvider ? providerPlansTable : tenantPlansTable;

  const content = `
    ${heading("Nuevos planes disponibles")}
    ${paragraph(`Hola <strong>${ownerName}</strong>,`)}
    ${paragraph(introText)}
    ${paragraph("Ahora puedes elegir el plan que mejor se adapte a tu negocio:")}
    ${plansTable}
    ${infoBox("El precio se mostrará en tu moneda local al momento de pagar. Todos los planes incluyen prueba gratuita de 14 días.", "success")}
    ${primaryButton("Elegir mi plan", `${settingsUrl}?billing=upgrade`)}
    ${mutedText("¿Tienes preguntas? Responde a este email y te ayudamos.")}
  `;

  const plansSummary = isProvider
    ? "Planes: Free (gratis), Pro €9,90/mes."
    : "Nuevos planes: Starter €14,50/mes, Standard €29,50/mes, Agency €49,50/mes.";

  return sendEmail({
    to,
    subject: wasTrialing
      ? `Tu prueba terminó — Elige tu plan en Hubents, ${orgName}`
      : `Nuevos planes disponibles en Hubents — ${orgName}`,
    html: emailWrapper(content),
    text: `Hola ${ownerName}, ${wasTrialing ? "tu prueba ha terminado" : "tenemos novedades"}. ${plansSummary} Elige tu plan en ${settingsUrl}`,
  });
}

// ============================================
// PROVIDER: PROFILE CLAIM NOTIFICATION
// ============================================

export async function sendProviderClaimNotificationEmail(
  to: string,
  providerCompanyName: string,
  plannerName: string,
  plannerOrgName: string,
  claimToken: string
) {
  const appUrl = getAppUrl();
  const claimUrl = `${appUrl}/claim/${claimToken}`;
  const removeUrl = `${appUrl}/api/claim/${claimToken}/remove`;

  const content = `
    ${heading("Alguien ha creado un perfil para tu empresa en Hubents")}
    ${paragraph(`Hola equipo de <strong>${providerCompanyName}</strong>,`)}
    ${paragraph(`<strong>${plannerName}</strong> de <strong>${plannerOrgName}</strong> ha añadido el perfil de vuestra empresa en <strong>Hubents</strong>, la plataforma de gestión de eventos.`)}

    <div style="background-color: ${COLORS.background}; border: 1px solid ${COLORS.border}; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
      <p style="margin: 0 0 14px; font-size: 14px; font-weight: 600; color: ${COLORS.textPrimary};">¿Qué significa esto para vuestro negocio?</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 6px 0; vertical-align: top; width: 22px; font-size: 15px;">✅</td>
          <td style="padding: 6px 0; font-size: 14px; color: ${COLORS.textPrimary}; line-height: 1.5;">Organizadores de eventos pueden invitaros a sus proyectos</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; vertical-align: top; font-size: 15px;">📋</td>
          <td style="padding: 6px 0; font-size: 14px; color: ${COLORS.textPrimary}; line-height: 1.5;">Recibiréis presupuestos, tareas y coordinación directa desde la plataforma</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; vertical-align: top; font-size: 15px;">🏅</td>
          <td style="padding: 6px 0; font-size: 14px; color: ${COLORS.textPrimary}; line-height: 1.5;">Al verificar el perfil, apareceréis como proveedor verificado en el directorio</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; vertical-align: top; font-size: 15px;">💼</td>
          <td style="padding: 6px 0; font-size: 14px; color: ${COLORS.textPrimary}; line-height: 1.5;">Acceso a nuevas oportunidades de negocio de planners de toda España</td>
        </tr>
      </table>
    </div>

    ${infoBox("Para verificar que sois los propietarios del perfil y empezar a recibir oportunidades de negocio, registraos en la plataforma. Es <strong>gratuito</strong>.", "success")}
    ${primaryButton("Reclamar y verificar mi perfil", claimUrl)}

    <p style="margin: 20px 0 0; font-size: 13px; color: ${COLORS.textSecondary}; line-height: 1.5;">
      Si no reconocéis esta empresa o creéis que esto es un error, podéis ignorar este email. El perfil ya es visible en el directorio, pero aparecerá como <strong>no verificado</strong> hasta que lo reclaméis.
    </p>
    <p style="margin: 12px 0 0; font-size: 12px; color: ${COLORS.textSecondary}; line-height: 1.5;">
      ¿Preferís que eliminemos vuestros datos? <a href="${removeUrl}" style="color: ${COLORS.textSecondary}; text-decoration: underline;">Solicitar eliminación de datos</a> (RGPD).
    </p>
    ${mutedText("Este es un mensaje automático de Hubents · La plataforma de gestión de eventos")}
  `;

  return sendEmail({
    to,
    subject: `${plannerOrgName} ha añadido el perfil de ${providerCompanyName} en Hubents`,
    html: emailWrapper(content),
    text: `Hola equipo de ${providerCompanyName}, ${plannerName} de ${plannerOrgName} ha añadido el perfil de vuestra empresa en Hubents. Para verificar el perfil y empezar a recibir oportunidades de negocio, registraos en: ${claimUrl}`,
  });
}

// ============================================
// PROVIDER: PROFILE CLAIMED — notify the creator
// ============================================

export async function sendProviderProfileClaimedEmail(
  to: string,
  creatorName: string,
  providerCompanyName: string,
  providerOrgSlug?: string | null
) {
  const profileUrl = providerOrgSlug
    ? `${getAppUrl()}/partners/${providerOrgSlug}`
    : `${getAppUrl()}/dashboard/partners`;

  const content = `
    ${heading("Tu proveedor ya está en Hubents")}
    ${paragraph(`Hola <strong>${creatorName}</strong>,`)}
    ${infoBox(
      `<strong>${providerCompanyName}</strong> ha reclamado y verificado su perfil en Hubents. Ahora está activo en la plataforma y puede recibir invitaciones a eventos, presupuestos y coordinación directa.`,
      "success"
    )}
    ${paragraph("Puedes invitarle a tus próximos eventos directamente desde Partners:")}
    ${primaryButton("Ver perfil del proveedor", profileUrl)}
    ${mutedText("Este es un mensaje automático de Hubents.")}
  `;

  return sendEmail({
    to,
    subject: `${providerCompanyName} ya está verificado en Hubents`,
    html: emailWrapper(content),
    text: `Hola ${creatorName}, ${providerCompanyName} ha reclamado su perfil en Hubents. Ahora está activo en la plataforma. Ver perfil: ${profileUrl}`,
  });
}

// ============================================
// PROVIDER: MANUAL VERIFICATION NEEDED (generic email)
// ============================================

export async function sendProviderManualVerificationEmail(
  to: string,
  providerCompanyName: string,
  plannerName: string,
  plannerOrgName: string,
  phone?: string,
  claimToken?: string
) {
  const appUrl = getAppUrl();
  const removeUrl = claimToken ? `${appUrl}/api/claim/${claimToken}/remove` : null;

  const content = `
    ${heading("Alguien ha creado un perfil para tu empresa en Hubents")}
    ${paragraph(`Hola equipo de <strong>${providerCompanyName}</strong>,`)}
    ${paragraph(`<strong>${plannerName}</strong> de <strong>${plannerOrgName}</strong> ha añadido el perfil de vuestra empresa en <strong>Hubents</strong>, la plataforma de gestión de eventos.`)}

    ${infoBox(
      `Como el correo registrado es de uso personal (Gmail, Hotmail, etc.), la verificación automática no está disponible. Para verificar que sois los propietarios del perfil, nuestro equipo se pondrá en contacto${phone ? ` al número <strong>${phone}</strong>` : ""} para confirmar vuestra identidad.`,
      "warning"
    )}

    <div style="background-color: ${COLORS.background}; border: 1px solid ${COLORS.border}; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
      <p style="margin: 0 0 14px; font-size: 14px; font-weight: 600; color: ${COLORS.textPrimary};">¿Por qué verificar el perfil?</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 6px 0; vertical-align: top; width: 22px; font-size: 15px;">✅</td>
          <td style="padding: 6px 0; font-size: 14px; color: ${COLORS.textPrimary}; line-height: 1.5;">Badge de empresa verificada · más confianza y visibilidad</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; vertical-align: top; font-size: 15px;">📋</td>
          <td style="padding: 6px 0; font-size: 14px; color: ${COLORS.textPrimary}; line-height: 1.5;">Recibir invitaciones directas a eventos y proyectos</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; vertical-align: top; font-size: 15px;">💼</td>
          <td style="padding: 6px 0; font-size: 14px; color: ${COLORS.textPrimary}; line-height: 1.5;">Gestionar presupuestos, tareas y pagos desde la plataforma</td>
        </tr>
      </table>
    </div>

    ${paragraph("Mientras tanto, puedes adelantarte y crear vuestra cuenta:")}
    ${primaryButton("Crear cuenta en Hubents", `${appUrl}/auth/register?orgType=provider`)}

    <p style="margin: 20px 0 0; font-size: 13px; color: ${COLORS.textSecondary}; line-height: 1.5;">
      Si no reconocéis esta empresa o creéis que esto es un error, podéis ignorar este email.
      El perfil ya es visible en el directorio pero aparecerá como <strong>pendiente de verificación</strong>.
    </p>
    ${removeUrl ? `<p style="margin: 12px 0 0; font-size: 12px; color: ${COLORS.textSecondary}; line-height: 1.5;">¿Preferís que eliminemos vuestros datos? <a href="${removeUrl}" style="color: ${COLORS.textSecondary}; text-decoration: underline;">Solicitar eliminación de datos</a> (RGPD).</p>` : ""}
    ${mutedText("Este es un mensaje automático de Hubents · La plataforma de gestión de eventos")}
  `;

  return sendEmail({
    to,
    subject: `${plannerOrgName} ha añadido el perfil de ${providerCompanyName} en Hubents`,
    html: emailWrapper(content),
    text: `Hola equipo de ${providerCompanyName}, ${plannerName} de ${plannerOrgName} ha añadido vuestro perfil en Hubents. Como el correo es de uso personal, la verificación se realizará de forma manual${phone ? ` al número ${phone}` : ""}. Crea tu cuenta en ${appUrl}/auth/register`,
  });
}

// ============================================
// CLIENT COLLABORATOR INVITATION EMAIL
// ============================================

export async function sendClientCollaboratorInviteEmail(
  to: string,
  eventName: string,
  organizationName: string,
  inviterName: string | null,
  inviteUrl: string,
  roleName?: string | null
) {
  const roleText = roleName ? ` como <strong>${roleName}</strong>` : "";
  const inviterText = inviterName
    ? `<strong>${inviterName}</strong> te ha invitado`
    : "Has sido invitado";

  const headingText = roleName
    ? `Te invitaron como ${roleName}`
    : "Te invitaron a colaborar en un evento";

  const content = `
    ${heading(headingText)}
    ${paragraph(`${inviterText}${roleText} al evento <strong>${eventName}</strong> de <strong>${organizationName}</strong> en Hubents.`)}
    <div style="background-color: ${COLORS.background}; border: 1px solid ${COLORS.border}; border-radius: 6px; padding: 16px; margin: 24px 0; text-align: center;">
      <p style="margin: 0 0 4px; font-size: 13px; color: ${COLORS.textSecondary};">Evento:</p>
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${COLORS.textPrimary};">${eventName}</p>
    </div>
    ${paragraph("Al aceptar, podrás acceder a la información del evento según los permisos que te han asignado.")}
    ${primaryButton("Aceptar invitación", inviteUrl)}
    ${mutedText("Esta invitación expira en 7 días.")}
  `;

  const subjectRole = roleName ? ` como ${roleName}` : " a colaborar";
  return sendEmail({
    to,
    subject: `Te invitaron${subjectRole} en "${eventName}" — ${organizationName}`,
    html: emailWrapper(content),
    text: `${inviterName || "Alguien"} te invitó${roleName ? ` como ${roleName}` : " a colaborar"} en el evento "${eventName}" de ${organizationName}. Acepta la invitación aquí: ${inviteUrl}`,
  });
}

// ============================================
// CLIENT COLLABORATOR NOTIFICATION EMAIL (existing user)
// ============================================

export async function sendClientCollaboratorNotificationEmail(
  to: string,
  eventName: string,
  organizationName: string,
  inviterName: string | null,
  roleName?: string | null
) {
  const roleLabel = roleName || "colaborador";
  const inviterText = inviterName
    ? `<strong>${inviterName}</strong> te ha agregado`
    : "Has sido agregado";

  const content = `
    ${heading(`Te agregaron como ${roleLabel}`)}
    ${paragraph(`${inviterText} como <strong>${roleLabel}</strong> del evento <strong>${eventName}</strong> de <strong>${organizationName}</strong>.`)}
    ${paragraph("Ya puedes acceder al evento desde tu panel de Hubents.")}
    ${primaryButton("Ver evento", `${getAppUrl()}/dashboard`)}
  `;

  const subjectRole = roleName || "colaborador";
  return sendEmail({
    to,
    subject: `Te agregaron como ${subjectRole} en "${eventName}" — ${organizationName}`,
    html: emailWrapper(content),
    text: `${inviterName || "Alguien"} te agregó como ${subjectRole} del evento "${eventName}" de ${organizationName}. Accede desde ${getAppUrl()}/dashboard`,
  });
}

// ============================================
// VERIFICATION REQUEST — al usuario (confirmación)
// ============================================

export async function sendVerificationRequestConfirmEmail(
  to: string,
  ownerName: string,
  companyName: string
) {
  const content = `
    ${heading("Solicitud de verificación recibida")}
    ${paragraph(`Hola <strong>${ownerName}</strong>,`)}
    ${infoBox(`Hemos recibido tu solicitud de verificación para <strong>${companyName}</strong>. Nuestro equipo la revisará en las próximas 24–48 horas.`, "success")}
    ${paragraph("Una vez verificada, tu empresa aparecerá con el badge de <strong>Verificado en Hubents</strong> en el directorio de Partners.")}
    ${paragraph("Si tienes alguna duda, puedes responder a este email.")}
    ${primaryButton("Ver mi perfil", `${getAppUrl()}/dashboard/public-profile`)}
    ${mutedText("Hubents — La plataforma de gestión de eventos")}
  `;

  return sendEmail({
    to,
    subject: `Solicitud de verificación recibida — ${companyName}`,
    html: emailWrapper(content),
    text: `Hola ${ownerName}, hemos recibido tu solicitud de verificación para ${companyName}. La revisaremos en 24–48 horas. Accede a tu perfil en ${getAppUrl()}/dashboard/public-profile`,
  });
}

// ============================================
// VERIFICATION REQUEST — aviso a hello@hubents.com
// ============================================

export async function sendVerificationRequestAdminEmail(
  orgId: number,
  orgName: string,
  orgEmail: string,
  orgSlug: string,
  orgType: string | null
) {
  const appUrl = getAppUrl();
  const adminUrl = `${appUrl}/admin/tenants/${orgId}`;
  const publicUrl = `${appUrl}/providers/${orgSlug}`;

  const content = `
    ${heading("Nueva solicitud de verificación")}
    ${paragraph("Una organización ha solicitado la verificación de su perfil en Hubents.")}
    <div style="background-color: ${COLORS.background}; border: 1px solid ${COLORS.border}; border-radius: 8px; padding: 18px 22px; margin: 20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 5px 0; font-size: 13px; color: ${COLORS.textSecondary}; width: 110px;">Organización</td>
          <td style="padding: 5px 0; font-size: 13px; font-weight: 600; color: ${COLORS.textPrimary};">${orgName}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-size: 13px; color: ${COLORS.textSecondary};">Email</td>
          <td style="padding: 5px 0; font-size: 13px; color: ${COLORS.textPrimary};">${orgEmail}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-size: 13px; color: ${COLORS.textSecondary};">Tipo</td>
          <td style="padding: 5px 0; font-size: 13px; color: ${COLORS.textPrimary};">${orgType || "provider"}</td>
        </tr>
      </table>
    </div>
    ${primaryButton("Revisar en Admin Panel", adminUrl)}
    <p style="text-align: center; margin: 8px 0 0; font-size: 12px; color: ${COLORS.textSecondary};">
      <a href="${publicUrl}" style="color: ${COLORS.textSecondary};">Ver perfil público</a>
    </p>
    ${mutedText("Hubents Admin · Solicitud automática desde el perfil público")}
  `;

  return sendEmail({
    to: "hello@hubents.com",
    subject: `[Verificación] ${orgName} ha solicitado verificación`,
    html: emailWrapper(content),
    text: `Nueva solicitud de verificación de ${orgName} (${orgEmail}). Revisar en: ${adminUrl}`,
  });
}

// ============================================
// ONBOARDING NUDGE
// ============================================

export interface OnboardingNudgeStep {
  label: string;
  done: boolean;
}

export async function sendOnboardingNudgeEmail(
  to: string,
  ownerName: string,
  companyName: string,
  steps: OnboardingNudgeStep[],
  nudgeType: "day3" | "day7" | "day14",
  isProvider: boolean
) {
  const appUrl = getAppUrl();
  const dashUrl = `${appUrl}/dashboard`;
  const completedCount = steps.filter((s) => s.done).length;
  const pct = Math.round((completedCount / steps.length) * 100);

  const nudgeMessages: Record<string, { subject: string; headline: string; body: string }> = {
    day3: {
      subject: `${companyName}, te quedan ${steps.length - completedCount} pasos para completar tu perfil`,
      headline: "Estás a mitad de camino 🌱",
      body: "Han pasado 3 días desde que te uniste a Hubents. Completa los pasos pendientes para sacarle el máximo partido a la plataforma.",
    },
    day7: {
      subject: `Semana 1 en Hubents — ¿cómo vas?`,
      headline: "Una semana juntos ⚡",
      body: "Llevas una semana en Hubents. Estos son los pasos que aún tienes pendientes para aparecer mejor posicionado.",
    },
    day14: {
      subject: `${companyName}, tu perfil puede estar mucho más completo`,
      headline: "Tu perfil necesita atención 🔥",
      body: "Dos semanas después, algunos pasos importantes siguen sin completarse. Con 10 minutos puedes mejorar mucho tu visibilidad.",
    },
  };

  const msg = nudgeMessages[nudgeType];

  // Barra de progreso HTML
  const barFill = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0 8px;">
      <tr>
        <td style="background: #e5e7eb; border-radius: 999px; height: 8px; overflow: hidden;">
          <div style="background: #111827; width: ${pct}%; height: 8px; border-radius: 999px;"></div>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 20px; font-size: 12px; color: ${COLORS.textSecondary};">${completedCount} de ${steps.length} pasos completados · ${pct}%</p>
  `;

  // Lista de pasos
  const stepsList = steps.map((s) => `
    <tr>
      <td style="padding: 7px 0; vertical-align: top; width: 22px; font-size: 15px;">${s.done ? "✅" : "⬜"}</td>
      <td style="padding: 7px 0; font-size: 13.5px; color: ${s.done ? COLORS.textSecondary : COLORS.textPrimary}; line-height: 1.4;
        ${s.done ? "text-decoration: line-through;" : ""}">${s.label}</td>
    </tr>
  `).join("");

  const content = `
    ${heading(msg.headline)}
    ${paragraph(`Hola <strong>${ownerName}</strong>,`)}
    ${paragraph(msg.body)}
    ${barFill}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      ${stepsList}
    </table>
    ${primaryButton(isProvider ? "Completar mi perfil" : "Ir a mi panel", isProvider ? `${dashUrl}/public-profile` : dashUrl)}
    ${mutedText("Si ya no necesitas este recordatorio, puedes ignorar este email.")}
  `;

  return sendEmail({
    to,
    subject: msg.subject,
    html: emailWrapper(content),
    text: `Hola ${ownerName}, tienes ${steps.length - completedCount} pasos pendientes en Hubents. Accede desde: ${dashUrl}`,
  });
}
