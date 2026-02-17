import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, subscriptionPlans, organizations, users, organizationMembers } from "@/db/schema";
import { eq, and, lte, gte, isNotNull } from "drizzle-orm";
import {
  sendTrialExpiringEmail,
  sendTrialExpiredEmail,
  sendWinBackEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Allow in dev
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    trialExpiring3Days: 0,
    trialExpiredToday: 0,
    winBack7Days: 0,
    errors: [] as string[],
  };

  try {
    const now = new Date();

    // === 1. Trial expiring in 3 days ===
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysStart = new Date(threeDaysFromNow);
    threeDaysStart.setHours(0, 0, 0, 0);
    const threeDaysEnd = new Date(threeDaysFromNow);
    threeDaysEnd.setHours(23, 59, 59, 999);

    const expiringTrials = await db
      .select({
        subId: subscriptions.id,
        orgId: subscriptions.organizationId,
        planId: subscriptions.planId,
        trialEndsAt: subscriptions.trialEndsAt,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "trialing"),
          gte(subscriptions.trialEndsAt, threeDaysStart),
          lte(subscriptions.trialEndsAt, threeDaysEnd),
          isNotNull(subscriptions.trialEndsAt)
        )
      );

    for (const trial of expiringTrials) {
      try {
        const ownerEmail = await getOrgOwnerEmail(trial.orgId);
        const org = await db.query.organizations.findFirst({
          where: eq(organizations.id, trial.orgId),
        });
        const plan = await db.query.subscriptionPlans.findFirst({
          where: eq(subscriptionPlans.id, trial.planId),
        });

        if (ownerEmail && org && plan) {
          await sendTrialExpiringEmail(ownerEmail, org.name, 3, plan.name);
          results.trialExpiring3Days++;
        }
      } catch (err) {
        results.errors.push(`trial-expiring org=${trial.orgId}: ${err}`);
      }
    }

    // === 2. Trial expired today (trialEndsAt is in the past, status still trialing) ===
    const expiredTrials = await db
      .select({
        subId: subscriptions.id,
        orgId: subscriptions.organizationId,
        planId: subscriptions.planId,
        trialEndsAt: subscriptions.trialEndsAt,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "trialing"),
          lte(subscriptions.trialEndsAt, now),
          isNotNull(subscriptions.trialEndsAt)
        )
      );

    for (const trial of expiredTrials) {
      try {
        const ownerEmail = await getOrgOwnerEmail(trial.orgId);
        const org = await db.query.organizations.findFirst({
          where: eq(organizations.id, trial.orgId),
        });
        const plan = await db.query.subscriptionPlans.findFirst({
          where: eq(subscriptionPlans.id, trial.planId),
        });

        if (ownerEmail && org && plan) {
          // Check if trial ended today (not earlier - to avoid re-sending)
          const trialEnd = trial.trialEndsAt ? new Date(trial.trialEndsAt) : null;
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);

          if (trialEnd && trialEnd >= todayStart) {
            await sendTrialExpiredEmail(ownerEmail, org.name, plan.name);
            results.trialExpiredToday++;
          }
        }

        // Only cancel locally-managed subs (no Stripe). Stripe-managed subs
        // will be canceled by Stripe via webhook (customer.subscription.deleted).
        const fullSub = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.id, trial.subId),
        });
        if (!fullSub?.stripeSubscriptionId) {
          await db
            .update(subscriptions)
            .set({ status: "canceled", canceledAt: now, updatedAt: now })
            .where(eq(subscriptions.id, trial.subId));
        }
      } catch (err) {
        results.errors.push(`trial-expired org=${trial.orgId}: ${err}`);
      }
    }

    // === 3. Win-back: Trial expired 7 days ago, no active subscription ===
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysStart = new Date(sevenDaysAgo);
    sevenDaysStart.setHours(0, 0, 0, 0);
    const sevenDaysEnd = new Date(sevenDaysAgo);
    sevenDaysEnd.setHours(23, 59, 59, 999);

    const winBackCandidates = await db
      .select({
        subId: subscriptions.id,
        orgId: subscriptions.organizationId,
        canceledAt: subscriptions.canceledAt,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "canceled"),
          gte(subscriptions.canceledAt, sevenDaysStart),
          lte(subscriptions.canceledAt, sevenDaysEnd)
        )
      );

    for (const candidate of winBackCandidates) {
      try {
        const ownerEmail = await getOrgOwnerEmail(candidate.orgId);
        const org = await db.query.organizations.findFirst({
          where: eq(organizations.id, candidate.orgId),
        });

        if (ownerEmail && org) {
          await sendWinBackEmail(ownerEmail, org.name);
          results.winBack7Days++;
        }
      } catch (err) {
        results.errors.push(`win-back org=${candidate.orgId}: ${err}`);
      }
    }

    console.log("📧 Subscription lifecycle cron results:", results);

    return NextResponse.json({
      success: true,
      data: results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Subscription lifecycle cron error:", error);
    return NextResponse.json(
      { success: false, error: "Cron job failed" },
      { status: 500 }
    );
  }
}

async function getOrgOwnerEmail(orgId: number): Promise<string | null> {
  // Try to get org owner
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  if (org?.ownerId) {
    const owner = await db.query.users.findFirst({
      where: eq(users.id, org.ownerId),
    });
    if (owner?.email) return owner.email;
  }

  // Fallback: get first member
  const [member] = await db
    .select({ email: users.email })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(eq(organizationMembers.organizationId, orgId))
    .limit(1);

  return member?.email || null;
}
