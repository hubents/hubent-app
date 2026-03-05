import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { guests, guestGroups } from "@/db/schema";
import { eq } from "drizzle-orm";

type RouteParams = { params: Promise<{ eventId: string }> };

interface CSVGuest {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  groupName?: string;
  menuPreference?: string;
  ageGroup?: string;
  notes?: string;
}

function parseCSV(csvText: string): CSVGuest[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const results: CSVGuest[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    const guest: CSVGuest = {
      firstName: row["nombre"] || row["firstname"] || row["first_name"] || row["name"] || "",
      lastName: row["apellido"] || row["lastname"] || row["last_name"] || "",
      email: row["email"] || row["correo"] || row["mail"] || "",
      phone: row["telefono"] || row["phone"] || row["tel"] || row["celular"] || "",
      groupName: row["grupo"] || row["group"] || row["mesa"] || row["table"] || "",
      menuPreference: row["menu"] || row["menupreference"] || row["dieta"] || "",
      ageGroup: row["edad"] || row["agegroup"] || row["age_group"] || row["tipo"] || "",
      notes: row["notas"] || row["notes"] || row["observaciones"] || "",
    };

    if (guest.firstName) {
      results.push(guest);
    }
  }

  return results;
}

// POST /api/events/[eventId]/guests/import - Import guests from CSV
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "guests", "edit");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "NO_FILE", message: "No file provided" } },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const parsedGuests = parseCSV(csvText);

    if (parsedGuests.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "EMPTY_FILE", message: "No valid guests found in CSV" } },
        { status: 400 }
      );
    }

    const groupCache: Record<string, number> = {};
    let imported = 0;
    let skipped = 0;

    for (const g of parsedGuests) {
      try {
        let groupId: number | null = null;

        if (g.groupName) {
          if (groupCache[g.groupName]) {
            groupId = groupCache[g.groupName];
          } else {
            const existingGroup = await db
              .select({ id: guestGroups.id })
              .from(guestGroups)
              .where(eq(guestGroups.eventId, eventIdNum))
              .limit(100);

            const found = existingGroup.find(
              (grp) => grp.id && g.groupName
            );

            if (found) {
              groupId = found.id;
            } else {
              const [newGroup] = await db.insert(guestGroups).values({
                eventId: eventIdNum,
                name: g.groupName,
              }).returning();
              groupId = newGroup.id;
            }
            groupCache[g.groupName] = groupId;
          }
        }

        const normalizedAgeGroup = 
          g.ageGroup?.toLowerCase().includes("niño") || g.ageGroup?.toLowerCase().includes("child") ? "child" :
          g.ageGroup?.toLowerCase().includes("bebe") || g.ageGroup?.toLowerCase().includes("baby") ? "baby" :
          "adult";

        await db.insert(guests).values({
          eventId: eventIdNum,
          firstName: g.firstName,
          lastName: g.lastName || null,
          email: g.email || null,
          phone: g.phone || null,
          groupId,
          menuPreference: g.menuPreference || null,
          ageGroup: normalizedAgeGroup,
          notes: g.notes || null,
        });

        imported++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        imported,
        skipped,
        total: parsedGuests.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import guests";
    const status = message.includes("Forbidden") ? 403 : message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "IMPORT_ERROR", message } },
      { status }
    );
  }
}
