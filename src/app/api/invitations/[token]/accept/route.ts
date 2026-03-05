import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invitations, organizations, users, organizationMembers, contacts, eventParticipants } from "@/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const session = await auth();
    
    let body: { name?: string; password?: string } = {};
    try {
      body = await request.json();
    } catch {
      // No body provided, that's ok for existing users
    }

    const invitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.token, token),
        eq(invitations.status, "pending"),
        gt(invitations.expiresAt, new Date())
      ),
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitación no encontrada, expirada o ya utilizada" },
        { status: 404 }
      );
    }

    let user = await db.query.users.findFirst({
      where: eq(users.email, invitation.email.toLowerCase()),
    });

    if (session?.user?.email && session.user.email !== invitation.email) {
      return NextResponse.json(
        { error: "Esta invitación es para otro email" },
        { status: 403 }
      );
    }

    // Note: Neon HTTP driver doesn't support transactions, so we do sequential operations
    if (!user) {
      if (!body.name || !body.password) {
        return NextResponse.json(
          { error: "Nombre y contraseña son requeridos para nuevos usuarios" },
          { status: 400 }
        );
      }

      const passwordHash = await hashPassword(body.password);

      const [newUser] = await db
        .insert(users)
        .values({
          name: body.name,
          email: invitation.email.toLowerCase(),
          passwordHash,
          emailVerified: new Date(),
          onboardingCompleted: true,
        })
        .returning();

      user = newUser;
    }

    const existingMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, invitation.organizationId),
        eq(organizationMembers.userId, user!.id)
      ),
    });

    if (!existingMember) {
      await db.insert(organizationMembers).values({
        organizationId: invitation.organizationId,
        userId: user!.id,
        roleId: invitation.roleId,
        invitedBy: invitation.invitedBy,
        joinedAt: new Date(),
      });
    }

    await db
      .update(invitations)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
      })
      .where(eq(invitations.id, invitation.id));

    // Link contact↔user if this invitation has contact metadata
    const metadata = invitation.metadata as { contactId?: number; eventId?: number } | null;
    if (metadata?.contactId && user) {
      try {
        // Update contacts.userId
        await db.update(contacts)
          .set({ userId: user.id })
          .where(eq(contacts.id, metadata.contactId));

        // Update ALL event_participants for this contact (not just one event)
        // This fixes the case where a contact is a collaborator on multiple events
        await db.update(eventParticipants)
          .set({ userId: user.id, acceptedAt: new Date() })
          .where(
            and(
              eq(eventParticipants.contactId, metadata.contactId),
              isNull(eventParticipants.userId)
            )
          );
      } catch (linkErr) {
        console.error("Failed to link contact to user (non-blocking):", linkErr);
      }
    }

    return NextResponse.json({
      success: true,
      organizationId: invitation.organizationId,
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}
