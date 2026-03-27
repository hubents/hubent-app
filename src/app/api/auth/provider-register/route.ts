import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations, organizationMembers, roles, subscriptions, subscriptionPlans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/password";
import { sendProviderWelcomeEmail } from "@/lib/email";
import { z } from "zod";

const registerSchema = z.object({
  companyName: z.string().min(2, "Nombre de empresa requerido"),
  name: z.string().min(2, "Nombre requerido").optional(),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  instagram: z.string().optional().or(z.literal("")),
  category: z.string().min(1, "Categoría requerida"),
  phone: z.string().regex(/^[+\d\s\-()]{6,20}$/, "Formato de teléfono inválido").optional().or(z.literal("")),
  serviceRadius: z.number().optional(),
});

/**
 * POST /api/auth/provider-register
 * Independent registration for provider organizations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const { companyName, name, password, instagram, category, phone, serviceRadius } = parsed.data;
    const email = parsed.data.email.toLowerCase();
    const userName = name || companyName;

    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: { code: "EMAIL_EXISTS", message: "Este email ya está registrado" } },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate slug from company name
    const slug = companyName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check slug uniqueness
    const existingOrg = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    });

    const finalSlug = existingOrg ? `${slug}-${Math.random().toString(36).slice(2, 6)}` : slug;

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name: userName,
        passwordHash: hashedPassword,
        emailVerified: new Date(),
        phone: phone || null,
      })
      .returning();

    // Create provider organization (rollback user on failure)
    let newOrg;
    try {
      [newOrg] = await db
        .insert(organizations)
        .values({
          name: companyName,
          slug: finalSlug,
          orgType: "provider",
          ownerId: newUser.id,
          instagramHandle: instagram ? instagram.replace(/^@+/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "") : null,
          phone: phone || null,
          providerCategory: category,
          serviceRadius: serviceRadius || null,
          verificationStatus: "unverified",
        })
        .returning();
    } catch (orgError) {
      // Rollback: delete orphaned user
      await db.delete(users).where(eq(users.id, newUser.id));
      throw orgError;
    }

    // Create membership (rollback org + user on failure)
    try {
      // Find provider_owner role
      let providerOwnerRole = await db.query.roles.findFirst({
        where: eq(roles.slug, "provider_owner"),
      });

      // Fallback to owner role if provider_owner doesn't exist yet
      if (!providerOwnerRole) {
        providerOwnerRole = await db.query.roles.findFirst({
          where: eq(roles.slug, "owner"),
        });
      }

      if (providerOwnerRole) {
        await db.insert(organizationMembers).values({
          userId: newUser.id,
          organizationId: newOrg.id,
          roleId: providerOwnerRole.id,
        });
      }
    } catch (memberError) {
      // Rollback: delete org and user
      await db.delete(organizations).where(eq(organizations.id, newOrg.id));
      await db.delete(users).where(eq(users.id, newUser.id));
      throw memberError;
    }

    // Auto-assign provider-free plan
    try {
      const freePlan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.slug, "provider-free"),
      });
      if (freePlan) {
        await db.insert(subscriptions).values({
          organizationId: newOrg.id,
          planId: freePlan.id,
          status: "active",
          currentPeriodStart: new Date(),
        });
        await db
          .update(organizations)
          .set({ planId: freePlan.id })
          .where(eq(organizations.id, newOrg.id));
      }
    } catch (planError) {
      console.error("Failed to assign provider-free plan:", planError);
    }

    // Send welcome email (non-blocking)
    sendProviderWelcomeEmail(email, newUser.name || companyName, companyName).catch((e) =>
      console.error("Failed to send provider welcome email:", e)
    );

    return NextResponse.json({
      success: true,
      data: {
        userId: newUser.id,
        organizationId: newOrg.id,
        slug: finalSlug,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/auth/provider-register error:", error);
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json(
      { success: false, error: { code: "REGISTER_ERROR", message } },
      { status: 500 }
    );
  }
}
