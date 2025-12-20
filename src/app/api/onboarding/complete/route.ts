import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations, events, invitations, roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

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

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          onboardingCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, session.user!.id!));

      const userOrgs = await tx.query.organizations.findFirst({
        where: eq(organizations.ownerId, session.user!.id!),
      });

      if (userOrgs && company) {
        await tx
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
          await tx.insert(events).values({
            organizationId: userOrgs.id,
            name: event.name,
            type: event.type || "wedding",
            date: event.date ? new Date(event.date) : null,
            status: "draft",
            createdBy: session.user!.id!,
          });
        }

        if (teamEmails && teamEmails.length > 0) {
          let memberRole = await tx.query.roles.findFirst({
            where: eq(roles.slug, "planner"),
          });

          if (!memberRole) {
            const [createdRole] = await tx
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
              await tx.insert(invitations).values({
                organizationId: userOrgs.id,
                email: email.toLowerCase().trim(),
                roleId: memberRole.id,
                token: crypto.randomUUID(),
                status: "pending",
                invitedBy: session.user!.id!,
                expiresAt,
              });
            }
          }
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding complete error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
