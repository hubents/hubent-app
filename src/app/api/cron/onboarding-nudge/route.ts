import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, organizationMembers, users, onboardingNudgeLog } from "@/db/schema";
import { eq, and, sql, not, inArray } from "drizzle-orm";
import { sendOnboardingNudgeEmail, type OnboardingNudgeStep } from "@/lib/email";

// GET /api/cron/onboarding-nudge — Vercel Cron (diario a las 10:00)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = { sent: 0, skipped: 0, errors: [] as string[] };

  // Nudge tiers: días desde creación → tipo
  const NUDGE_TIERS: { minDays: number; maxDays: number; type: "day3" | "day7" | "day14" }[] = [
    { minDays: 3,  maxDays: 4,  type: "day3"  },
    { minDays: 7,  maxDays: 8,  type: "day7"  },
    { minDays: 14, maxDays: 15, type: "day14" },
  ];

  for (const tier of NUDGE_TIERS) {
    const minDate = new Date(now);
    minDate.setDate(minDate.getDate() - tier.maxDays);
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() - tier.minDays);

    // Orgs creadas en la ventana de días y que aún no recibieron este nudge
    const alreadySentRows = await db
      .select({ orgId: onboardingNudgeLog.organizationId })
      .from(onboardingNudgeLog)
      .where(eq(onboardingNudgeLog.nudgeType, tier.type));
    const alreadySentIds = alreadySentRows.map((r) => r.orgId);

    const orgs = await db
      .select({
        id:                 organizations.id,
        name:               organizations.name,
        orgType:            organizations.orgType,
        verificationStatus: organizations.verificationStatus,
        instagramHandle:    organizations.instagramHandle,
        providerCategory:   organizations.providerCategory,
        profileCompleteness: organizations.profileCompleteness,
        fiscalName:         organizations.fiscalName,
        createdAt:          organizations.createdAt,
      })
      .from(organizations)
      .where(
        and(
          sql`${organizations.createdAt} >= ${minDate.toISOString()}`,
          sql`${organizations.createdAt} < ${maxDate.toISOString()}`,
          sql`${organizations.status} = 'active'`,
          alreadySentIds.length > 0
            ? not(inArray(organizations.id, alreadySentIds))
            : sql`TRUE`
        )
      );

    for (const org of orgs) {
      try {
        // Calcular pasos pendientes según tipo de cuenta
        const isProvider = org.orgType === "provider";

        let steps: OnboardingNudgeStep[];
        let completedCount: number;

        if (isProvider) {
          const [portfolioRows, invoiceRows] = await Promise.all([
            db.execute(sql`SELECT COUNT(*)::int AS cnt FROM org_portfolio WHERE organization_id = ${org.id}`),
            db.execute(sql`SELECT COUNT(*)::int AS cnt FROM financial_documents WHERE organization_id = ${org.id} AND type = 'invoice'`),
          ]);
          const portfolioCount = Number((portfolioRows.rows?.[0] as { cnt?: number })?.cnt ?? 0);
          const invoiceCount   = Number((invoiceRows.rows?.[0]   as { cnt?: number })?.cnt ?? 0);

          steps = [
            { label: "Completar perfil público",     done: (org.profileCompleteness ?? 0) >= 60 },
            { label: "Subir fotos de portfolio",     done: portfolioCount > 0 },
            { label: "Agregar Instagram",            done: !!org.instagramHandle },
            { label: "Configurar datos fiscales",    done: !!org.fiscalName },
            { label: "Emitir primera factura",       done: invoiceCount > 0 },
            { label: "Solicitar verificación",       done: org.verificationStatus === "verified" || org.verificationStatus === "pending" },
          ];
        } else {
          const [eventRows, contactRows, quoteRows] = await Promise.all([
            db.execute(sql`SELECT COUNT(*)::int AS cnt FROM events WHERE organization_id = ${org.id} AND status != 'cancelled'`),
            db.execute(sql`SELECT COUNT(*)::int AS cnt FROM contacts WHERE organization_id = ${org.id}`),
            db.execute(sql`SELECT COUNT(*)::int AS cnt FROM financial_documents WHERE organization_id = ${org.id} AND type = 'quote'`),
          ]);
          const eventCount   = Number((eventRows.rows?.[0]   as { cnt?: number })?.cnt ?? 0);
          const contactCount = Number((contactRows.rows?.[0] as { cnt?: number })?.cnt ?? 0);
          const quoteCount   = Number((quoteRows.rows?.[0]   as { cnt?: number })?.cnt ?? 0);

          steps = [
            { label: "Crear primer evento",     done: eventCount > 0 },
            { label: "Agregar contactos",        done: contactCount > 0 },
            { label: "Emitir un presupuesto",    done: quoteCount > 0 },
            { label: "Explorar proveedores",     done: false },
          ];
        }

        completedCount = steps.filter((s) => s.done).length;

        // No enviar si ya completó todos los pasos
        if (completedCount === steps.length) {
          results.skipped++;
          continue;
        }

        // Obtener email del owner
        const ownerMember = await db
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(eq(organizationMembers.organizationId, org.id))
          .limit(1);

        if (!ownerMember.length) { results.skipped++; continue; }

        const owner = await db.query.users.findFirst({
          where: eq(users.id, ownerMember[0].userId),
        });

        if (!owner?.email) { results.skipped++; continue; }

        await sendOnboardingNudgeEmail(
          owner.email,
          owner.name || org.name,
          org.name,
          steps,
          tier.type,
          isProvider
        );

        // Registrar el envío para no repetirlo
        await db.insert(onboardingNudgeLog).values({
          organizationId: org.id,
          nudgeType: tier.type,
        }).onConflictDoNothing();

        results.sent++;
      } catch (err) {
        results.errors.push(`org ${org.id}: ${String(err)}`);
      }
    }
  }

  console.log(`[onboarding-nudge] sent=${results.sent} skipped=${results.skipped} errors=${results.errors.length}`);
  return NextResponse.json({ success: true, ...results });
}
