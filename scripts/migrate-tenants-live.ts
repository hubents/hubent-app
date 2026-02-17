import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";

const sql = neon(process.env.DATABASE_URL!);
const DRY_RUN = !process.argv.includes("--execute");
const SEND_EMAILS = process.argv.includes("--send-emails");
const FREE_PLAN_ID = 1;
const GOS_SA_ORG_ID = 1;

async function main() {
  console.log(`\n🔧 Migrate Tenants to Live`);
  console.log(`   Mode: ${DRY_RUN ? "🔍 DRY RUN (no changes)" : "⚡ EXECUTE (real changes)"}`);
  console.log(`   Emails: ${SEND_EMAILS ? "✅ Will send" : "❌ Skipped (add --send-emails)"}\n`);

  // === 1. Audit all tenants ===
  const orgs = await sql`
    SELECT o.id, o.name, o.plan_id, o.org_type, o.owner_id,
           s.id as sub_id, s.status, s.plan_id as sub_plan_id, s.trial_ends_at,
           s.stripe_subscription_id, s.stripe_customer_id,
           sp.name as plan_name, sp.slug as plan_slug,
           u.email as owner_email, u.name as owner_name
    FROM organizations o
    LEFT JOIN subscriptions s ON s.organization_id = o.id
    LEFT JOIN subscription_plans sp ON sp.id = COALESCE(s.plan_id, o.plan_id)
    LEFT JOIN users u ON u.id = o.owner_id
    ORDER BY o.id
  `;

  console.log(`📊 Found ${orgs.length} organizations\n`);

  const now = new Date();
  let stats = {
    total: orgs.length,
    activeTrials: 0,
    expiredTrials: 0,
    alreadyFree: 0,
    activePaid: 0,
    noSubscription: 0,
    gosCleanup: false,
    emailsSent: 0,
    errors: [] as string[],
  };

  // === 2. Categorize and process ===
  for (const org of orgs) {
    const trialEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
    const isExpiredTrial = org.status === "trialing" && trialEnd && trialEnd < now;
    const isActiveTrial = org.status === "trialing" && trialEnd && trialEnd >= now;
    const hasTestStripeIds = org.stripe_subscription_id?.startsWith("sub_") && 
      org.stripe_subscription_id?.includes("Ru3peAw36N"); // test account prefix

    // GOS SA: clean test Stripe IDs, keep Agency
    if (org.id === GOS_SA_ORG_ID) {
      if (hasTestStripeIds || org.stripe_customer_id?.startsWith("cus_Tzo")) {
        console.log(`  🧹 [${org.id}] ${org.name} — Clean test Stripe IDs (keep Agency active)`);
        if (!DRY_RUN) {
          await sql`UPDATE subscriptions SET stripe_subscription_id = NULL, stripe_customer_id = NULL, updated_at = NOW() WHERE id = ${org.sub_id}`;
        }
        stats.gosCleanup = true;
      } else {
        console.log(`  ✅ [${org.id}] ${org.name} — Agency active (no test IDs)`);
      }
      stats.activePaid++;
      continue;
    }

    // Expired trial → Free
    if (isExpiredTrial) {
      console.log(`  📦 [${org.id}] ${org.name} — Trial expired (${trialEnd?.toLocaleDateString()}) → Free`);
      if (!DRY_RUN) {
        await sql`UPDATE subscriptions SET status = 'canceled', canceled_at = NOW(), updated_at = NOW() WHERE id = ${org.sub_id}`;
        await sql`UPDATE organizations SET plan_id = ${FREE_PLAN_ID}, updated_at = NOW() WHERE id = ${org.id}`;
      }
      stats.expiredTrials++;

      // Send email
      if (SEND_EMAILS && org.owner_email) {
        try {
          await sendPlansEmail(org.owner_email, org.owner_name || "Usuario", org.name, true);
          stats.emailsSent++;
          console.log(`     📧 Email sent to ${org.owner_email}`);
        } catch (err) {
          stats.errors.push(`Email failed for org ${org.id}: ${err}`);
          console.log(`     ❌ Email failed: ${err}`);
        }
      }
      continue;
    }

    // Active trial (not expired yet)
    if (isActiveTrial) {
      console.log(`  ⏳ [${org.id}] ${org.name} — Trial active until ${trialEnd?.toLocaleDateString()} (no change)`);
      stats.activeTrials++;
      continue;
    }

    // Already free or no subscription
    if (!org.sub_id) {
      console.log(`  ⚪ [${org.id}] ${org.name} — No subscription`);
      stats.noSubscription++;
      continue;
    }

    if (org.status === "canceled" || org.plan_slug === "free") {
      console.log(`  ⚪ [${org.id}] ${org.name} — Already ${org.status}/${org.plan_slug}`);
      stats.alreadyFree++;
      continue;
    }

    // Active paid (shouldn't happen without Stripe, but handle)
    if (org.status === "active" && org.id !== GOS_SA_ORG_ID) {
      console.log(`  🟢 [${org.id}] ${org.name} — Active (${org.plan_name})`);
      stats.activePaid++;
      continue;
    }

    console.log(`  ❓ [${org.id}] ${org.name} — Unknown state: status=${org.status} plan=${org.plan_slug}`);
  }

  // === 3. Summary ===
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📋 SUMMARY ${DRY_RUN ? "(DRY RUN)" : "(EXECUTED)"}`);
  console.log(`${"═".repeat(60)}`);
  console.log(`  Total orgs:        ${stats.total}`);
  console.log(`  Expired → Free:    ${stats.expiredTrials}`);
  console.log(`  Active trials:     ${stats.activeTrials}`);
  console.log(`  Already free:      ${stats.alreadyFree}`);
  console.log(`  Active paid:       ${stats.activePaid}`);
  console.log(`  No subscription:   ${stats.noSubscription}`);
  console.log(`  GOS SA cleanup:    ${stats.gosCleanup ? "yes" : "no"}`);
  console.log(`  Emails sent:       ${stats.emailsSent}`);
  if (stats.errors.length > 0) {
    console.log(`  ❌ Errors:         ${stats.errors.length}`);
    stats.errors.forEach(e => console.log(`     - ${e}`));
  }
  console.log(`${"═".repeat(60)}\n`);

  if (DRY_RUN) {
    console.log(`💡 To execute for real: npx tsx scripts/migrate-tenants-live.ts --execute`);
    console.log(`💡 To also send emails:  npx tsx scripts/migrate-tenants-live.ts --execute --send-emails\n`);
  }
}

async function sendPlansEmail(to: string, ownerName: string, orgName: string, wasTrialing: boolean) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.EMAIL_FROM || "HubEnts <noreply@hubents.com>";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.hubents.com";

  const subject = wasTrialing
    ? `Tu prueba terminó — Elige tu plan en HubEnts, ${orgName}`
    : `Nuevos planes disponibles en HubEnts — ${orgName}`;

  const introText = wasTrialing
    ? `Tu período de prueba en <strong>${orgName}</strong> ha finalizado. Tu cuenta ha pasado al plan <strong>Free</strong>, pero toda tu información está segura.`
    : `Tenemos novedades para <strong>${orgName}</strong> en HubEnts.`;

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
    <h2 style="margin:0 0 20px;font-size:22px;font-weight:600;color:#111827;">Nuevos planes disponibles</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#111827;line-height:1.6;">Hola <strong>${ownerName}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;color:#111827;line-height:1.6;">${introText}</p>
    <p style="margin:0 0 16px;font-size:15px;color:#111827;line-height:1.6;">Ahora puedes elegir el plan que mejor se adapte a tu negocio:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <tr style="background:#f9fafb;">
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;border-bottom:1px solid #e5e7eb;">Plan</td>
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;border-bottom:1px solid #e5e7eb;text-align:center;">Mensual</td>
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;border-bottom:1px solid #e5e7eb;text-align:center;">Anual</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:14px;color:#111827;border-bottom:1px solid #e5e7eb;"><strong>Starter</strong></td>
        <td style="padding:12px 16px;font-size:14px;color:#111827;text-align:center;border-bottom:1px solid #e5e7eb;">€14,50/mes</td>
        <td style="padding:12px 16px;font-size:14px;color:#111827;text-align:center;border-bottom:1px solid #e5e7eb;">€145/año</td>
      </tr>
      <tr style="background:#ecfdf5;">
        <td style="padding:12px 16px;font-size:14px;color:#111827;border-bottom:1px solid #e5e7eb;"><strong>Standard</strong> ⭐</td>
        <td style="padding:12px 16px;font-size:14px;color:#111827;text-align:center;border-bottom:1px solid #e5e7eb;">€29,50/mes</td>
        <td style="padding:12px 16px;font-size:14px;color:#111827;text-align:center;border-bottom:1px solid #e5e7eb;">€295/año</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:14px;color:#111827;"><strong>Agency</strong></td>
        <td style="padding:12px 16px;font-size:14px;color:#111827;text-align:center;">€49,50/mes</td>
        <td style="padding:12px 16px;font-size:14px;color:#111827;text-align:center;">€495/año</td>
      </tr>
    </table>
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;padding:14px 16px;margin:24px 0;">
      <p style="margin:0;font-size:14px;color:#065f46;line-height:1.5;">El precio se mostrará en tu moneda local al momento de pagar. Todos los planes incluyen prueba gratuita de 7 días.</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td align="center">
        <a href="${appUrl}/dashboard/settings?billing=upgrade" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:500;font-size:14px;">Elegir mi plan</a>
      </td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">¿Tienes preguntas? Responde a este email y te ayudamos.</p>
  </td></tr>
  <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:13px;color:#9ca3af;">© ${new Date().getFullYear()} HubEnts. Todos los derechos reservados.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  await resend.emails.send({ from: fromEmail, to, subject, html });
}

main().catch(console.error);
