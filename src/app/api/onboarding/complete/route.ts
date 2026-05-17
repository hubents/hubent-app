import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, organizations, events, invitations, roles, subscriptions, subscriptionPlans, eventCollaborations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { sendOrganizationInviteEmail } from "@/lib/email";
import { calculateProfileCompleteness } from "@/config/provider-constants";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await auth();

    if (!session?.user?.id) {
      return badRequest("No autorizado", "UNAUTHORIZED");
    }

    const body = await request.json();
    const { profile, company, event, teamEmails, providerProfile, orgType: requestedOrgType } = body;

    // Mark user as onboarded + save profile data
    const userUpdate: Record<string, unknown> = {
      onboardingCompleted: true,
      updatedAt: new Date(),
    };
    if (profile?.name) userUpdate.name = profile.name;
    if (profile?.phone) userUpdate.phone = profile.phone;
    if (profile?.bio) userUpdate.bio = profile.bio;

    await db
      .update(users)
      .set(userUpdate)
      .where(eq(users.id, session.user!.id!));

    const userOrg = await db.query.organizations.findFirst({
      where: eq(organizations.ownerId, session.user!.id!),
    });

    if (!userOrg) {
      return ok({ success: true });
    }

    // Handle orgType conversion (Google OAuth auto-created as tenant but user selected provider)
    let isProvider = userOrg.orgType === "provider";

    if (requestedOrgType === "provider" && userOrg.orgType !== "provider") {
      const providerPlan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.slug, "provider-free"),
      });

      if (providerPlan) {
        await db
          .update(organizations)
          .set({
            orgType: "provider",
            planId: providerPlan.id,
            verificationStatus: "unverified",
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, userOrg.id));

        await db
          .update(subscriptions)
          .set({
            planId: providerPlan.id,
            status: "active",
            trialEndsAt: null,
          })
          .where(eq(subscriptions.organizationId, userOrg.id));

        isProvider = true;
      }
    }

    if (isProvider) {
      // ─── Provider Onboarding ──────────────────────────────────
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      // Company base fields
      if (company?.name) updateData.name = company.name;
      if (profile?.phone) updateData.phone = profile.phone;
      if (company?.timezone || company?.currency) {
        updateData.settings = {
          timezone: company?.timezone || "America/Argentina/Buenos_Aires",
          currency: company?.currency || "USD",
          language: "es",
        };
      }

      // Provider public profile / Partners directory fields
      if (providerProfile) {
        if (providerProfile.description) updateData.description = providerProfile.description;
        if (providerProfile.tagline) updateData.tagline = providerProfile.tagline;
        if (providerProfile.providerCategory) updateData.providerCategory = providerProfile.providerCategory;
        if (providerProfile.instagramHandle) updateData.instagramHandle = providerProfile.instagramHandle;
        if (providerProfile.city) updateData.city = providerProfile.city;
        if (providerProfile.region) updateData.region = providerProfile.region;
        if (providerProfile.coverImage) updateData.coverImage = providerProfile.coverImage;
        if (providerProfile.logoUrl) updateData.logo = providerProfile.logoUrl;
        if (providerProfile.providerModule) updateData.providerModule = providerProfile.providerModule;
      }

      // Calculate profile completeness
      const completeness = calculateProfileCompleteness({
        logo: (updateData.logo as string) || userOrg.logo || undefined,
        description: (updateData.description as string) || userOrg.description,
        tagline: (updateData.tagline as string) || userOrg.tagline,
        providerCategory: (updateData.providerCategory as string) || userOrg.providerCategory,
        city: (updateData.city as string) || userOrg.city,
        coverImage: (updateData.coverImage as string) || userOrg.coverImage,
        instagramHandle: (updateData.instagramHandle as string) || userOrg.instagramHandle,
        phone: (updateData.phone as string) || userOrg.phone,
        websiteUrl: userOrg.website,
        services: userOrg.services,
      });
      updateData.profileCompleteness = completeness;

      await db
        .update(organizations)
        .set(updateData)
        .where(eq(organizations.id, userOrg.id));

      if (teamEmails && teamEmails.length > 0) {
        let teamRole = await db.query.roles.findFirst({
          where: eq(roles.slug, "admin"),
        });

        if (!teamRole) {
          const [createdRole] = await db
            .insert(roles)
            .values({
              name: "Admin",
              slug: "admin",
              description: "Administrador - gestión completa",
              isSystem: true,
            })
            .returning();
          teamRole = createdRole;
        }

        if (teamRole) {
          await sendTeamInvitations(teamEmails, userOrg as { id: number; name: string }, teamRole, session.user!.id!);
        }
      }

      // Providers do NOT create events during onboarding
    } else {
      // ─── Planner Onboarding ───────────────────────────────────
      if (company) {
        const orgUpdate: Record<string, unknown> = {
          settings: {
            timezone: company.timezone || "America/Argentina/Buenos_Aires",
            currency: company.currency || "USD",
            language: "es",
          },
          updatedAt: new Date(),
        };
        if (company.name) orgUpdate.name = company.name;
        await db.update(organizations).set(orgUpdate).where(eq(organizations.id, userOrg.id));
      }

      // Create first event if provided
      if (event?.name) {
        await db.insert(events).values({
          organizationId: userOrg.id,
          name: event.name,
          type: event.type || "wedding",
          date: event.date ? new Date(event.date) : null,
          status: "draft",
          createdBy: session.user!.id!,
          guestCount: event.guestCount ? Number(event.guestCount) : null,
          budget: event.budget ? String(event.budget) : null,
        });
      }

      if (teamEmails && teamEmails.length > 0) {
        let memberRole = await db.query.roles.findFirst({
          where: eq(roles.slug, "manager"),
        });

        if (!memberRole) {
          const [createdRole] = await db
            .insert(roles)
            .values({
              name: "Manager",
              slug: "manager",
              description: "Gestor - eventos, tareas, CRM, proveedores, formularios",
              isSystem: true,
            })
            .returning();
          memberRole = createdRole;
        }

        if (memberRole) {
          await sendTeamInvitations(teamEmails, userOrg as { id: number; name: string }, memberRole, session.user!.id!);
        }
      }
    }

    // Auto-link pending collaboration invitations by email
    if (session.user?.email && userOrg) {
      try {
        const linked = await db
          .update(eventCollaborations)
          .set({ guestOrgId: userOrg.id, status: "pending", updatedAt: new Date() })
          .where(
            and(
              eq(eventCollaborations.invitationEmail, session.user.email),
              eq(eventCollaborations.status, "pending_registration"),
            ),
          )
          .returning({ id: eventCollaborations.id });
        if (linked.length > 0) {
          console.log(`Auto-linked ${linked.length} collaboration invitations for ${session.user.email}`);
        }
      } catch (err) {
        console.error("Auto-link collaboration invitations failed:", err);
      }
    }

    return ok(null);
  }, "POST /api/onboarding/complete");
}

async function sendTeamInvitations(
  emails: string[],
  org: { id: number; name: string },
  role: { id: number; name: string },
  invitedBy: string
) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  for (const email of emails) {
    if (email && email.includes("@")) {
      const token = crypto.randomUUID();
      await db.insert(invitations).values({
        organizationId: org.id,
        email: email.toLowerCase().trim(),
        roleId: role.id,
        token,
        status: "pending",
        invitedBy,
        expiresAt,
      });

      sendOrganizationInviteEmail(
        email.toLowerCase().trim(),
        org.name,
        role.name,
        null,
        `${appUrl}/invite/${token}`
      ).catch((err) => console.error("Failed to send invite email:", err));
    }
  }
}
