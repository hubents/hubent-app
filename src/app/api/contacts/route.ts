import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getContacts, createContact, findDuplicateContacts } from "@/lib/contacts";
import { notifyNewContact } from "@/lib/push-notifications";

// GET /api/contacts - List contacts
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole("viewer");
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || undefined;
    const type = searchParams.get("type") || undefined;
    const isLeadParam = searchParams.get("isLead");
    const isLead = isLeadParam === "true" ? true : isLeadParam === "false" ? false : undefined;

    const result = await getContacts(session, { page, limit, search, type, isLead });

    return NextResponse.json({
      success: true,
      data: result.data,
      stats: result.stats,
      meta: result.meta,
    });
  } catch (error) {
    console.error("GET /api/contacts error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch contacts";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}

// POST /api/contacts - Create contact
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole("planner");
    const body = await request.json();

    const { type, name } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name is required" } },
        { status: 400 }
      );
    }

    if (!type || !["person", "company"].includes(type)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Type must be 'person' or 'company'" } },
        { status: 400 }
      );
    }

    // Check for duplicates (skip if forceDuplicate is true)
    if (!body.forceDuplicate) {
      const duplicates = await findDuplicateContacts(session, body.email, body.phone);
      if (duplicates.length > 0) {
        return NextResponse.json({
          success: false,
          error: {
            code: "DUPLICATE_WARNING",
            message: "Possible duplicate contacts found",
            duplicates,
          },
        }, { status: 409 });
      }
    }

    const contact = await createContact(session, {
      type,
      name,
      email: body.email,
      phone: body.phone,
      phoneCountryCode: body.phoneCountryCode,
      avatar: body.avatar,
      firstName: body.firstName,
      lastName: body.lastName,
      passportId: body.passportId,
      nieOrCif: body.nieOrCif,
      tradeName: body.tradeName,
      taxId: body.taxId,
      website: body.website,
      contactPersonName: body.contactPersonName,
      contactPersonEmail: body.contactPersonEmail,
      eventDate: body.eventDate ? new Date(body.eventDate) : undefined,
      guestCount: body.guestCount,
      budget: body.budget,
      venueType: body.venueType,
      address: body.address,
      city: body.city,
      state: body.state,
      postalCode: body.postalCode,
      country: body.country,
      bankName: body.bankName,
      bankAccountNumber: body.bankAccountNumber,
      bankIban: body.bankIban,
      bankSwift: body.bankSwift,
      paymentMethods: body.paymentMethods,
      tags: body.tags,
      source: body.source,
      isLead: body.isLead,
      notes: body.notes,
      isVendor: body.isVendor,
      vendorCategory: body.vendorCategory,
    });

    // Send push notification for new contact
    notifyNewContact(
      session.organizationId.toString(),
      name,
      type,
      session.user.userId
    ).catch(err => console.error("Push notification failed:", err));

    return NextResponse.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    console.error("POST /api/contacts error:", error);
    const message = error instanceof Error ? error.message : "Failed to create contact";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status }
    );
  }
}
