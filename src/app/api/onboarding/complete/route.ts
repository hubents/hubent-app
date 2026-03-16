import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations, events, invitations, roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { sendOrganizationInviteEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { profile, company, event, teamEmails } = body;

    // Note: Neon HTTP driver doesn't support transactions, so we do sequential operations
    await db
      .update(users)
      .set({
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user!.id!));

    const userOrgs = await db.query.organizations.findFirst({
      where: eq(organizations.ownerId, session.user!.id!),
    });

    if (userOrgs && company) {
      await db
        .update(organizations)
        .set({
          logo: company.logo || null,
          settings: {
            timezone: company.timezone || "America/Argentina/Buenos_Aires",
            currency: company.currency || "USD",
            language: "es",
          },
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, userOrgs.id));

      if (event?.name) {
        await db.insert(events).values({
          organizationId: userOrgs.id,
          name: event.name,
          type: event.type || "wedding",
          date: event.date ? new Date(event.date) : null,
          status: "draft",
          createdBy: session.user!.id!,
        });
      }

      if (teamEmails && teamEmails.length > 0) {
        let memberRole = await db.query.roles.findFirst({
          where: eq(roles.slug, "planner"),
        });

        if (!memberRole) {
          const [createdRole] = await db
            .insert(roles)
            .values({
              name: "Planner",
              slug: "planner",
              description: "Planificador de eventos",
              isSystem: true,
            })
            .returning();
          memberRole = createdRole;
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        for (const email of teamEmails) {
          if (email && email.includes("@")) {
            const token = crypto.randomUUID();
            await db.insert(invitations).values({
              organizationId: userOrgs.id,
              email: email.toLowerCase().trim(),
              roleId: memberRole.id,
              token,
              status: "pending",
              invitedBy: session.user!.id!,
              expiresAt,
            });

            // Send invitation email (fire-and-forget)
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            sendOrganizationInviteEmail(
              email.toLowerCase().trim(),
              userOrgs.name,
              memberRole.name,
              session.user?.name || null,
              `${appUrl}/invite/${token}`
            ).catch((err) => console.error("Failed to send invite email:", err));
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding complete error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
