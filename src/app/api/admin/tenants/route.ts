import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, subscriptionPlans } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const tenants = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        status: organizations.status,
        planId: organizations.planId,
        phone: organizations.phone,
        website: organizations.website,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .orderBy(desc(organizations.createdAt));

    const plans = await db.select().from(subscriptionPlans);

    return NextResponse.json({ tenants, plans });
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json(
      { error: "Error al obtener tenants" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, planId, phone, website, status } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Nombre y slug son requeridos" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingOrg = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug.toLowerCase()),
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: "El slug ya está en uso" },
        { status: 400 }
      );
    }

    const [newTenant] = await db
      .insert(organizations)
      .values({
        name,
        slug: slug.toLowerCase(),
        planId: planId || null,
        phone: phone || null,
        website: website || null,
        status: status || "active",
      })
      .returning();

    return NextResponse.json({ tenant: newTenant }, { status: 201 });
  } catch (error) {
    console.error("Error creating tenant:", error);
    return NextResponse.json(
      { error: "Error al crear tenant" },
      { status: 500 }
    );
  }
}
