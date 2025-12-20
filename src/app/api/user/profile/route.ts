import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, organizations, organizationMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get organization through membership
    let organization = null;
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, userId),
    });

    if (membership) {
      organization = await db.query.organizations.findFirst({
        where: eq(organizations.id, membership.organizationId),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
        organization: organization ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        } : null,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const { name, organization: orgData } = body;

    // Update user name
    if (name !== undefined) {
      await db
        .update(users)
        .set({
          name,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    // Update organization if provided
    if (orgData) {
      const membership = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, userId),
      });

      if (membership) {
        await db
          .update(organizations)
          .set({
            ...(orgData.name !== undefined && { name: orgData.name }),
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, membership.organizationId));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
