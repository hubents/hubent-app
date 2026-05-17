import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { leadStages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

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
export async function GET(_request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:read");

    const stages = await db.query.leadStages.findMany({
      where: eq(leadStages.organizationId, session.organizationId),
      orderBy: (s, { asc }) => [asc(s.sortOrder)],
    });

    return ok(stages);
  }, "GET /api/crm/stages");
}

// POST /api/crm/stages - Create stage or initialize defaults
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const body = await request.json();

    // If body has "initializeDefaults" flag, create default stages
    if (body.initializeDefaults) {
      const existingStages = await db.query.leadStages.findMany({
        where: eq(leadStages.organizationId, session.organizationId),
      });

      if (existingStages.length > 0) {
        return ok(existingStages);
      }

      const createdStages = [];
      for (const stage of DEFAULT_STAGES) {
        const [created] = await db.insert(leadStages).values({
          organizationId: session.organizationId,
          ...stage,
        }).returning();
        createdStages.push(created);
      }

      return ok(createdStages);
    }

    // Create single stage
    const { name, color, sortOrder, isDefault, isWon, isLost } = body;

    if (!name) {
      return badRequest("Name is required");
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

    return ok(stage);
  }, "POST /api/crm/stages");
}
