import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { leadStages } from "@/db/schema";
import { eq } from "drizzle-orm";

// Default stages for a wedding planning CRM
const DEFAULT_STAGES = [
  { name: "Nuevo Lead", color: "#6366f1", sortOrder: 0, isDefault: true, isWon: false, isLost: false },
  { name: "Contactado", color: "#8b5cf6", sortOrder: 1, isDefault: false, isWon: false, isLost: false },
  { name: "Reunión Agendada", color: "#ec4899", sortOrder: 2, isDefault: false, isWon: false, isLost: false },
  { name: "Propuesta Enviada", color: "#f59e0b", sortOrder: 3, isDefault: false, isWon: false, isLost: false },
  { name: "Negociación", color: "#10b981", sortOrder: 4, isDefault: false, isWon: false, isLost: false },
  { name: "Ganado", color: "#22c55e", sortOrder: 5, isDefault: false, isWon: true, isLost: false },
  { name: "Perdido", color: "#ef4444", sortOrder: 6, isDefault: false, isWon: false, isLost: true },
];

// GET /api/crm/stages - List stages
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole("viewer");

    const stages = await db.query.leadStages.findMany({
      where: eq(leadStages.organizationId, session.organizationId),
      orderBy: (s, { asc }) => [asc(s.sortOrder)],
    });

    return NextResponse.json({
      success: true,
      data: stages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch stages";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/crm/stages - Create stage or initialize defaults
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole("admin");
    const body = await request.json();

    // If body has "initializeDefaults" flag, create default stages
    if (body.initializeDefaults) {
      // Check if stages already exist
      const existingStages = await db.query.leadStages.findMany({
        where: eq(leadStages.organizationId, session.organizationId),
      });

      if (existingStages.length > 0) {
        return NextResponse.json({
          success: true,
          data: existingStages,
          message: "Stages already exist",
        });
      }

      // Create default stages
      const createdStages = [];
      for (const stage of DEFAULT_STAGES) {
        const [created] = await db.insert(leadStages).values({
          organizationId: session.organizationId,
          ...stage,
        }).returning();
        createdStages.push(created);
      }

      return NextResponse.json({
        success: true,
        data: createdStages,
        message: "Default stages created",
      });
    }

    // Create single stage
    const { name, color, sortOrder, isDefault, isWon, isLost } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name is required" } },
        { status: 400 }
      );
    }

    const [stage] = await db.insert(leadStages).values({
      organizationId: session.organizationId,
      name,
      color: color || "#6366f1",
      sortOrder: sortOrder || 0,
      isDefault: isDefault || false,
      isWon: isWon || false,
      isLost: isLost || false,
    }).returning();

    return NextResponse.json({
      success: true,
      data: stage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create stage";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}
