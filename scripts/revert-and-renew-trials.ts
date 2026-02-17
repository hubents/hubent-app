import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";

const sql = neon(process.env.DATABASE_URL!);
const DRY_RUN = !process.argv.includes("--execute");
const SEND_EMAILS = process.argv.includes("--send-emails");
const GOS_SA_ORG_ID = 1;
const TRIAL_DAYS = 14;

async function main() {
  console.log(`\n🔄 Revert & Renew Trials`);
  console.log(`   Mode: ${DRY_RUN ? "🔍 DRY RUN (no changes)" : "⚡ EXECUTE (real changes)"}`);
  console.log(`   Emails: ${SEND_EMAILS ? "✅ Will send" : "❌ Skipped (add --send-emails)"}`);
  console.log(`   Trial period: ${TRIAL_DAYS} days\n`);

  // === 1. Get all orgs with subscriptions ===
  const orgs = await sql`
    SELECT o.id, o.name, o.plan_id as org_plan_id, o.org_type, o.owner_id,
           s.id as sub_id, s.status, s.plan_id as sub_plan_id, s.trial_ends_at,
           s.canceled_at, s.stripe_subscription_id,
           sp.name as sub_plan_name, sp.slug as sub_plan_slug,
           op.name as org_plan_name, op.slug as org_plan_slug,
           u.email as owner_email, u.name as owner_name
    FROM organizations o
    LEFT JOIN subscriptions s ON s.organization_id = o.id
    LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
    LEFT JOIN subscription_plans op ON op.id = o.plan_id
    LEFT JOIN users u ON u.id = o.owner_id
    ORDER BY o.id
  `;

  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  let stats = {
    total: orgs.length,
    planRestored: 0,
    trialsRenewed: 0,
    skippedGos: false,
    skippedActiveTrial: 0,
    skippedNoSub: 0,
    emailsSent: 0,
    errors: [] as string[],
  };

  console.log(`📊 Found ${orgs.length} organizations\n`);

  for (const org of orgs) {
    // Skip GOS SA (Agency, already correct)
    if (org.id === GOS_SA_ORG_ID) {
      console.log(`  ⏭️  [${org.id}] ${org.name} — GOS SA (Agency, skip)`);
      stats.skippedGos = true;
      continue;
    }

    // Skip orgs without subscription
    if (!org.sub_id) {
      console.log(`  ⏭️  [${org.id}] ${org.name} — No subscription (skip)`);
      stats.skippedNoSub++;
      continue;
    }

    // Skip if already an active trial with future end date
    const currentTrialEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
    if (org.status === "trialing" && currentTrialEnd && currentTrialEnd > now) {
      console.log(`  ⏳ [${org.id}] ${org.name} — Active trial until ${currentTrialEnd.toLocaleDateString()} (skip)`);
      stats.skippedActiveTrial++;
      continue;
    }

    // === STEP A: Restore org.plan_id if it was wrongly changed to Free (id=1) ===
    const orgWasDamaged = org.org_plan_id === 1 && org.sub_plan_id !== 1;
    if (orgWasDamaged) {
      console.log(`  🔧 [${org.id}] ${org.name} — Restore plan: Free(1) → ${org.sub_plan_name}(${org.sub_plan_id})`);
      if (!DRY_RUN) {
        await sql`UPDATE organizations SET plan_id = ${org.sub_plan_id}, updated_at = NOW() WHERE id = ${org.id}`;
      }
      stats.planRestored++;
    }

    // === STEP B: Renew trial ===
    const planName = orgWasDamaged ? org.sub_plan_name : (org.org_plan_name || org.sub_plan_name);
    const planId = org.sub_plan_id;
    console.log(`  🔄 [${org.id}] ${org.name} — Renew trial: ${planName} (${TRIAL_DAYS} days until ${trialEndsAt.toLocaleDateString()})`);

    if (!DRY_RUN) {
      await sql`
        UPDATE subscriptions SET
          status = 'trialing',
          canceled_at = NULL,
          trial_ends_at = ${trialEndsAt.toISOString()}::timestamp,
          current_period_start = ${now.toISOString()}::timestamp,
          current_period_end = ${trialEndsAt.toISOString()}::timestamp,
          updated_at = NOW()
        WHERE id = ${org.sub_id}
      `;
      // Also ensure org.plan_id matches the subscription plan
      if (!orgWasDamaged) {
        await sql`UPDATE organizations SET plan_id = ${planId}, updated_at = NOW() WHERE id = ${org.id}`;
      }
    }
    stats.trialsRenewed++;

    // === STEP C: Send email ===
    if (SEND_EMAILS && org.owner_email) {
      try {
        await sendTrialRenewedEmailDirect(
          org.owner_email,
          org.owner_name || "Usuario",
          org.name,
          planName,
          TRIAL_DAYS,
          trialEndsAt
        );
        stats.emailsSent++;
        console.log(`     📧 Email sent to ${org.owner_email}`);
      } catch (err) {
        stats.errors.push(`Email failed org ${org.id}: ${err}`);
        console.log(`     ❌ Email failed: ${err}`);
      }
    }
  }

  // === Summary ===
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📋 SUMMARY ${DRY_RUN ? "(DRY RUN)" : "(EXECUTED)"}`);
  console.log(`${"═".repeat(60)}`);
  console.log(`  Total orgs:         ${stats.total}`);
  console.log(`  Plans restored:     ${stats.planRestored}`);
  console.log(`  Trials renewed:     ${stats.trialsRenewed}`);
  console.log(`  Skipped GOS SA:     ${stats.skippedGos ? "yes" : "no"}`);
  console.log(`  Skipped active:     ${stats.skippedActiveTrial}`);
  console.log(`  Skipped no sub:     ${stats.skippedNoSub}`);
  console.log(`  Emails sent:        ${stats.emailsSent}`);
  if (stats.errors.length > 0) {
    console.log(`  ❌ Errors:          ${stats.errors.length}`);
    stats.errors.forEach(e => console.log(`     - ${e}`));
  }
  console.log(`${"═".repeat(60)}\n`);

  if (DRY_RUN) {
    console.log(`💡 To execute: npx tsx scripts/revert-and-renew-trials.ts --execute`);
    console.log(`💡 With emails: npx tsx scripts/revert-and-renew-trials.ts --execute --send-emails\n`);
  }
}

async function sendTrialRenewedEmailDirect(
  to: string,
  ownerName: string,
  orgName: string,
  planName: string,
  trialDays: number,
  trialEndsAt: Date
) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.EMAIL_FROM || "HubEnts <noreply@hubents.com>";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.hubents.com";

  const trialEndDate = trialEndsAt.toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f9fafb;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:48px 20px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;border:1px solid #e5e7eb;">
  <tr><td style="padding:32px 40px 24px;text-align:center;border-bottom:1px solid #e5e7eb;">
    <img src="${appUrl}/images/logo.png" alt="HubEnts" height="36" style="height:36px;" />
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <h2 style="margin:0 0 20px;font-size:22px;font-weight:600;color:#111827;">Tu prueba gratuita ha sido renovada</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#111827;line-height:1.6;">Hola <strong>${ownerName}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;color:#111827;line-height:1.6;">Buenas noticias para <strong>${orgName}</strong>: hemos renovado tu per\u00edodo de prueba gratuita.</p>
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;padding:14px 16px;margin:24px 0;">
      <p style="margin:0;font-size:14px;color:#065f46;line-height:1.5;">Tienes <strong>${trialDays} d\u00edas m\u00e1s</strong> para explorar todas las funcionalidades de tu plan <strong>${planName}</strong>. Tu prueba vence el <strong>${trialEndDate}</strong>.</p>
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#111827;line-height:1.6;">Durante este per\u00edodo tienes acceso completo a todas las herramientas de tu plan. Aprovecha para:</p>
    <p style="margin:0 0 16px;font-size:15px;color:#111827;line-height:1.6;">\u2022 Crear y gestionar tus eventos<br>\u2022 Organizar contactos y proveedores<br>\u2022 Administrar finanzas y pagos<br>\u2022 Colaborar con tu equipo</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td align="center">
        <a href="${appUrl}/dashboard" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:500;font-size:14px;">Acceder a mi cuenta</a>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;font-size:15px;color:#111827;line-height:1.6;">Cuando est\u00e9s listo, puedes elegir un plan de pago desde tu configuraci\u00f3n para no perder el acceso.</p>
    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">\u00bfTienes preguntas? Responde a este email y te ayudamos.</p>
  </td></tr>
  <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:13px;color:#9ca3af;">\u00a9 ${new Date().getFullYear()} HubEnts. Todos los derechos reservados.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  await resend.emails.send({
    from: fromEmail,
    to,
    subject: `Buenas noticias \u2014 Tu prueba gratuita fue renovada, ${orgName}`,
    html,
  });
}

main().catch(console.error);
