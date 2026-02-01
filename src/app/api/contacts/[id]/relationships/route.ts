import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { contacts, contactRelationships } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

// GET /api/contacts/[id]/relationships - Get all relationships for a contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("viewer");
    const { id } = await params;
    const contactId = parseInt(id, 10);

    if (isNaN(contactId)) {
      return NextResponse.json(
        { success: false, error: { message: "ID inválido" } },
        { status: 400 }
      );
    }

    // Get the contact to determine its type
    const [contact] = await db
      .select({ type: contacts.type })
      .from(contacts)
      .where(
        and(
          eq(contacts.id, contactId),
          eq(contacts.organizationId, session.organizationId)
        )
      )
      .limit(1);

    if (!contact) {
      return NextResponse.json(
        { success: false, error: { message: "Contacto no encontrado" } },
        { status: 404 }
      );
    }

    // Get relationships based on contact type
    let relationships;
    if (contact.type === "person") {
      // Get companies this person is related to
      relationships = await db
        .select({
          id: contactRelationships.id,
          role: contactRelationships.role,
          isPrimary: contactRelationships.isPrimary,
          createdAt: contactRelationships.createdAt,
          relatedContactId: contactRelationships.companyContactId,
          relatedContactName: contacts.name,
          relatedContactEmail: contacts.email,
          relatedContactAvatar: contacts.avatar,
          relatedContactType: contacts.type,
        })
        .from(contactRelationships)
        .innerJoin(contacts, eq(contacts.id, contactRelationships.companyContactId))
        .where(eq(contactRelationships.personContactId, contactId));
    } else {
      // Get people related to this company
      relationships = await db
        .select({
          id: contactRelationships.id,
          role: contactRelationships.role,
          isPrimary: contactRelationships.isPrimary,
          createdAt: contactRelationships.createdAt,
          relatedContactId: contactRelationships.personContactId,
          relatedContactName: contacts.name,
          relatedContactEmail: contacts.email,
          relatedContactAvatar: contacts.avatar,
          relatedContactType: contacts.type,
        })
        .from(contactRelationships)
        .innerJoin(contacts, eq(contacts.id, contactRelationships.personContactId))
        .where(eq(contactRelationships.companyContactId, contactId));
    }

    return NextResponse.json({
      success: true,
      data: relationships,
    });
  } catch (error) {
    console.error("GET /api/contacts/[id]/relationships error:", error);
    const message = error instanceof Error ? error.message : "Error al obtener relaciones";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { message } },
      { status }
    );
  }
}

// POST /api/contacts/[id]/relationships - Create a new relationship
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("planner");
    const { id } = await params;
    const contactId = parseInt(id, 10);
    const body = await request.json();
    const { relatedContactId, role, isPrimary } = body;

    if (isNaN(contactId) || !relatedContactId) {
      return NextResponse.json(
        { success: false, error: { message: "Datos inválidos" } },
        { status: 400 }
      );
    }

    // Get both contacts to verify types and ownership
    const contactsData = await db
      .select({
        id: contacts.id,
        type: contacts.type,
        organizationId: contacts.organizationId,
      })
      .from(contacts)
      .where(
        and(
          or(eq(contacts.id, contactId), eq(contacts.id, relatedContactId)),
          eq(contacts.organizationId, session.organizationId)
        )
      );

    if (contactsData.length !== 2) {
      return NextResponse.json(
        { success: false, error: { message: "Contactos no encontrados" } },
        { status: 404 }
      );
    }

    const mainContact = contactsData.find((c) => c.id === contactId);
    const relatedContact = contactsData.find((c) => c.id === relatedContactId);

    if (!mainContact || !relatedContact) {
      return NextResponse.json(
        { success: false, error: { message: "Contactos no encontrados" } },
        { status: 404 }
      );
    }

    // Determine person and company based on types
    let personContactId: number;
    let companyContactId: number;

    if (mainContact.type === "person" && relatedContact.type === "company") {
      personContactId = contactId;
      companyContactId = relatedContactId;
    } else if (mainContact.type === "company" && relatedContact.type === "person") {
      personContactId = relatedContactId;
      companyContactId = contactId;
    } else {
      return NextResponse.json(
        { success: false, error: { message: "Solo se pueden relacionar personas con empresas" } },
        { status: 400 }
      );
    }

    // Check if relationship already exists
    const [existing] = await db
      .select({ id: contactRelationships.id })
      .from(contactRelationships)
      .where(
        and(
          eq(contactRelationships.personContactId, personContactId),
          eq(contactRelationships.companyContactId, companyContactId)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, error: { message: "La relación ya existe" } },
        { status: 409 }
      );
    }

    // Create the relationship
    const [newRelationship] = await db
      .insert(contactRelationships)
      .values({
        personContactId,
        companyContactId,
        role: role || null,
        isPrimary: isPrimary || false,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newRelationship,
    });
  } catch (error) {
    console.error("POST /api/contacts/[id]/relationships error:", error);
    const message = error instanceof Error ? error.message : "Error al crear relación";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { message } },
      { status }
    );
  }
}

// DELETE /api/contacts/[id]/relationships - Delete a relationship
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("planner");
    const { id } = await params;
    const contactId = parseInt(id, 10);
    const { searchParams } = new URL(request.url);
    const relationshipId = parseInt(searchParams.get("relationshipId") || "", 10);

    if (isNaN(contactId) || isNaN(relationshipId)) {
      return NextResponse.json(
        { success: false, error: { message: "IDs inválidos" } },
        { status: 400 }
      );
    }

    // Verify the contact belongs to the organization
    const [contact] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(
          eq(contacts.id, contactId),
          eq(contacts.organizationId, session.organizationId)
        )
      )
      .limit(1);

    if (!contact) {
      return NextResponse.json(
        { success: false, error: { message: "Contacto no encontrado" } },
        { status: 404 }
      );
    }

    // Delete the relationship
    await db
      .delete(contactRelationships)
      .where(
        and(
          eq(contactRelationships.id, relationshipId),
          or(
            eq(contactRelationships.personContactId, contactId),
            eq(contactRelationships.companyContactId, contactId)
          )
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/contacts/[id]/relationships error:", error);
    const message = error instanceof Error ? error.message : "Error al eliminar relación";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { message } },
      { status }
    );
  }
}
