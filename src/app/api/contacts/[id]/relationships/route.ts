import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { contacts, contactRelationships } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { apiHandler, ok, created, notFound, badRequest, conflict } from "@/lib/api-handler";

// GET /api/contacts/[id]/relationships - Get all relationships for a contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:read");
    const { id } = await params;
    const contactId = parseInt(id, 10);

    if (isNaN(contactId)) {
      return badRequest("ID inválido");
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
      return notFound("Contacto no encontrado");
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

    return ok(relationships);
  }, "GET /api/contacts/[id]/relationships");
}

// POST /api/contacts/[id]/relationships - Create a new relationship
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const { id } = await params;
    const contactId = parseInt(id, 10);
    const body = await request.json();
    const { relatedContactId, role, isPrimary } = body;

    if (isNaN(contactId) || !relatedContactId) {
      return badRequest("Datos inválidos");
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
      return notFound("Contactos no encontrados");
    }

    const mainContact = contactsData.find((c) => c.id === contactId);
    const relatedContact = contactsData.find((c) => c.id === relatedContactId);

    if (!mainContact || !relatedContact) {
      return notFound("Contactos no encontrados");
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
      return badRequest("Solo se pueden relacionar personas con empresas");
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
      return conflict("La relación ya existe", "DUPLICATE");
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

    return created(newRelationship);
  }, "POST /api/contacts/[id]/relationships");
}

// DELETE /api/contacts/[id]/relationships - Delete a relationship
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const { id } = await params;
    const contactId = parseInt(id, 10);
    const { searchParams } = new URL(request.url);
    const relationshipId = parseInt(searchParams.get("relationshipId") || "", 10);

    if (isNaN(contactId) || isNaN(relationshipId)) {
      return badRequest("IDs inválidos");
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
      return notFound("Contacto no encontrado");
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

    return ok(null);
  }, "DELETE /api/contacts/[id]/relationships");
}
