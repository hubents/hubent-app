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
  return process.env.EMAIL_FROM || "HubEnts <noreply@hubents.com>";
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://app.hubents.com";
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
              <img src="${getLogoUrl()}" alt="HubEnts" height="36" style="display: block; margin: 0 auto; height: 36px;" />
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
  trialEndsAt: Date
) {
  const trialEndDate = trialEndsAt.toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const content = `
    ${heading("Bienvenido a HubEnts")}
    ${paragraph(`Hola <strong>${name}</strong>,`)}
    ${paragraph(`Tu cuenta para <strong>${companyName}</strong> ha sido creada exitosamente.`)}
    ${infoBox(`<strong>Tu prueba gratuita de 7 días</strong> está activa hasta el ${trialEndDate}. Tienes acceso completo a todas las funcionalidades.`, "success")}
    ${paragraph("¿Listo para comenzar? Completa tu configuración inicial:")}
    ${primaryButton("Comenzar configuración", `${getAppUrl()}/onboarding?welcome=true`)}
    ${mutedText("¿Necesitas ayuda? Responde a este email.")}
  `;

  return sendEmail({
    to,
    subject: `Bienvenido a HubEnts, ${name}`,
    html: emailWrapper(content),
    text: `Hola ${name}, tu cuenta para ${companyName} ha sido creada. Tu prueba gratuita está activa hasta el ${trialEndDate}. Visita ${getAppUrl()}/onboarding para comenzar.`,
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
    ${paragraph(`${inviterText} a unirte a <strong>${organizationName}</strong> en HubEnts.`)}
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
    ${paragraph(`${inviterText} a unirte al equipo de administración de <strong>HubEnts</strong>.`)}
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
    subject: `Invitación de Administrador - HubEnts`,
    html: emailWrapper(content),
    text: `Has sido invitado como ${levelLabel} de HubEnts. Acepta la invitación aquí: ${inviteUrl}`,
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
    ${paragraph(`Tu organización <strong>${organizationName}</strong> ha sido creada en HubEnts.`)}
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
    subject: `Tu cuenta en HubEnts está lista - ${organizationName}`,
    html: emailWrapper(content),
    text: `Hola ${ownerName}, tu organización ${organizationName} ha sido creada en HubEnts. Tus credenciales: Email: ${to}, Contraseña temporal: ${tempPassword}. Inicia sesión en ${getAppUrl()}/auth/login`,
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
    ${paragraph("Recibimos una solicitud para restablecer la contraseña de tu cuenta en HubEnts.")}
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
    subject: `Restablecer tu contraseña - HubEnts`,
    html: emailWrapper(content),
    text: `Recibimos una solicitud para restablecer tu contraseña. Visita este enlace para crear una nueva: ${resetUrl}. El enlace expira en 1 hora.`,
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
    ${mutedText("Este es un mensaje automático de HubEnts.")}
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
    ${heading("Bienvenido a HubEnts")}
    ${paragraph(`Hola <strong>${ownerName}</strong>,`)}
    ${paragraph(`Tu empresa <strong>${companyName}</strong> ha sido registrada como proveedor en la plataforma HubEnts.`)}
    ${infoBox("Tu cuenta está <strong>pendiente de verificación</strong>. Nuestro equipo revisará tu perfil y te notificaremos cuando esté aprobada.", "warning")}
    ${paragraph("Mientras tanto, puedes completar tu perfil para agilizar el proceso:")}
    ${primaryButton("Completar mi perfil", `${getAppUrl()}/vendor/profile`)}
    ${mutedText("Recibirás un email cuando tu cuenta sea verificada.")}
  `;

  return sendEmail({
    to,
    subject: `Bienvenido a HubEnts, ${ownerName}`,
    html: emailWrapper(content),
    text: `Hola ${ownerName}, tu empresa ${companyName} ha sido registrada como proveedor en HubEnts. Tu cuenta está pendiente de verificación. Completa tu perfil en ${getAppUrl()}/vendor/profile`,
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
    subject: `✅ ${companyName} verificada en HubEnts`,
    html: emailWrapper(content),
    text: `Hola ${ownerName}, tu empresa ${companyName} ha sido verificada en HubEnts. Ya puedes recibir invitaciones a eventos. Accede a tu panel en ${getAppUrl()}/vendor`,
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
    ${mutedText("Este es un mensaje automático de HubEnts.")}
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
  planName: string
) {
  const content = `
    ${heading("Tu prueba gratuita está por terminar")}
    ${paragraph(`Hola equipo de <strong>${orgName}</strong>,`)}
    ${infoBox(`Tu prueba del plan <strong>${planName}</strong> finaliza en <strong>${daysLeft} día${daysLeft > 1 ? "s" : ""}</strong>.`)}
    ${paragraph("Para seguir disfrutando de todas las funcionalidades, suscríbete a un plan antes de que termine tu prueba.")}
    ${paragraph("El precio se mostrará en tu moneda local al momento de pagar.")}
    ${primaryButton("Elegir mi plan", `${getAppUrl()}/dashboard/settings?billing=upgrade`)}
    ${mutedText("Si tienes alguna pregunta, responde a este email.")}
  `;

  return sendEmail({
    to,
    subject: `⏰ Tu prueba gratuita termina en ${daysLeft} día${daysLeft > 1 ? "s" : ""} — ${orgName}`,
    html: emailWrapper(content),
    text: `Hola ${orgName}, tu prueba del plan ${planName} termina en ${daysLeft} días. Suscríbete en ${getAppUrl()}/dashboard/settings`,
  });
}

export async function sendTrialExpiredEmail(
  to: string,
  orgName: string,
  planName: string
) {
  const content = `
    ${heading("Tu prueba gratuita ha terminado")}
    ${paragraph(`Hola equipo de <strong>${orgName}</strong>,`)}
    ${infoBox("Tu período de prueba ha finalizado. Tu cuenta ahora tiene acceso limitado en modo lectura.")}
    ${paragraph("Para recuperar el acceso completo a todas las funcionalidades, elige un plan:")}
    ${primaryButton("Suscribirse ahora", `${getAppUrl()}/dashboard/settings?billing=upgrade`)}
    ${paragraph("Tus datos están seguros y no se eliminarán. Puedes reactivar tu cuenta en cualquier momento.")}
    ${mutedText("Si necesitas ayuda, responde a este email.")}
  `;

  return sendEmail({
    to,
    subject: `Tu prueba de HubEnts ha terminado — ${orgName}`,
    html: emailWrapper(content),
    text: `Hola ${orgName}, tu prueba del plan ${planName} ha terminado. Suscríbete en ${getAppUrl()}/dashboard/settings`,
  });
}

export async function sendPaymentFailedEmail(
  to: string,
  orgName: string,
  planName: string
) {
  const content = `
    ${heading("Problema con tu pago")}
    ${paragraph(`Hola equipo de <strong>${orgName}</strong>,`)}
    ${infoBox("No pudimos procesar el pago de tu suscripción al plan <strong>" + planName + "</strong>.")}
    ${paragraph("Por favor, actualiza tu método de pago para evitar la suspensión de tu cuenta:")}
    ${primaryButton("Actualizar método de pago", `${getAppUrl()}/dashboard/settings?billing=update-payment`)}
    ${paragraph("Si crees que esto es un error, contacta a tu banco o responde a este email.")}
    ${mutedText("Stripe reintentará el cobro automáticamente en los próximos días.")}
  `;

  return sendEmail({
    to,
    subject: `⚠️ Problema con el pago de tu suscripción — ${orgName}`,
    html: emailWrapper(content),
    text: `Hola ${orgName}, no pudimos procesar el pago de tu plan ${planName}. Actualiza tu método de pago en ${getAppUrl()}/dashboard/settings`,
  });
}

export async function sendSubscriptionCanceledEmail(
  to: string,
  orgName: string,
  planName: string
) {
  const content = `
    ${heading("Tu suscripción ha sido cancelada")}
    ${paragraph(`Hola equipo de <strong>${orgName}</strong>,`)}
    ${paragraph(`Tu suscripción al plan <strong>${planName}</strong> ha sido cancelada.`)}
    ${paragraph("Tu cuenta seguirá activa hasta el final del período facturado. Después, pasará a modo lectura.")}
    ${paragraph("¿Cambiaste de opinión? Puedes reactivar tu suscripción en cualquier momento:")}
    ${primaryButton("Reactivar suscripción", `${getAppUrl()}/dashboard/settings?billing=upgrade`)}
    ${mutedText("Nos encantaría saber cómo mejorar. Responde a este email con tu feedback.")}
  `;

  return sendEmail({
    to,
    subject: `Tu suscripción de HubEnts ha sido cancelada — ${orgName}`,
    html: emailWrapper(content),
    text: `Hola ${orgName}, tu suscripción al plan ${planName} ha sido cancelada. Reactívala en ${getAppUrl()}/dashboard/settings`,
  });
}

export async function sendWinBackEmail(
  to: string,
  orgName: string
) {
  const content = `
    ${heading("Te extrañamos en HubEnts")}
    ${paragraph(`Hola equipo de <strong>${orgName}</strong>,`)}
    ${paragraph("Hace unos días que tu prueba gratuita terminó y queremos asegurarnos de que no te pierdas todo lo que HubEnts puede ofrecer.")}
    ${infoBox("🎁 <strong>Oferta especial:</strong> Suscríbete hoy y obtén un descuento en tu primer mes.", "success")}
    ${paragraph("Con HubEnts puedes gestionar eventos, contactos, finanzas y mucho más desde una sola plataforma.")}
    ${primaryButton("Volver a HubEnts", `${getAppUrl()}/dashboard/settings?billing=upgrade`)}
    ${mutedText("Si ya no deseas recibir estos emails, responde con 'cancelar'.")}
  `;

  return sendEmail({
    to,
    subject: `Te extrañamos — Vuelve a HubEnts, ${orgName}`,
    html: emailWrapper(content),
    text: `Hola ${orgName}, te extrañamos en HubEnts. Suscríbete en ${getAppUrl()}/dashboard/settings`,
  });
}

export async function sendPlansAvailableEmail(
  to: string,
  ownerName: string,
  orgName: string,
  wasTrialing: boolean
) {
  const introText = wasTrialing
    ? `Tu período de prueba en <strong>${orgName}</strong> ha finalizado. Tu cuenta ha pasado al plan <strong>Free</strong>, pero toda tu información está segura.`
    : `Tenemos novedades para <strong>${orgName}</strong> en HubEnts.`;

  const content = `
    ${heading("Nuevos planes disponibles")}
    ${paragraph(`Hola <strong>${ownerName}</strong>,`)}
    ${paragraph(introText)}
    ${paragraph("Ahora puedes elegir el plan que mejor se adapte a tu negocio:")}
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
    </table>
    ${infoBox("El precio se mostrará en tu moneda local al momento de pagar. Todos los planes incluyen prueba gratuita de 7 días.", "success")}
    ${primaryButton("Elegir mi plan", `${getAppUrl()}/dashboard/settings?billing=upgrade`)}
    ${mutedText("¿Tienes preguntas? Responde a este email y te ayudamos.")}
  `;

  return sendEmail({
    to,
    subject: wasTrialing
      ? `Tu prueba terminó — Elige tu plan en HubEnts, ${orgName}`
      : `Nuevos planes disponibles en HubEnts — ${orgName}`,
    html: emailWrapper(content),
    text: `Hola ${ownerName}, ${wasTrialing ? "tu prueba ha terminado" : "tenemos novedades"}. Nuevos planes: Starter €14,50/mes, Standard €29,50/mes, Agency €49,50/mes. Elige tu plan en ${getAppUrl()}/dashboard/settings`,
  });
}
