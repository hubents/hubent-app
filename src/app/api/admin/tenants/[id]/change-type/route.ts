import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/session";
import { apiHandler } from "@/lib/api-handler";

/**
 * POST /api/admin/tenants/[id]/change-type
 * 
 * STUB: Change an organization's orgType (e.g. planner -> provider or vice versa).
 * This is a Phase 2 feature that requires cascading changes:
 * 
 * 1. Cancel existing Stripe subscription
 * 2. Assign a compatible default plan for the new orgType
 * 3. Remap existing team member roles to the new orgType's role set
 * 4. Reset verification status (new type must be re-verified)
 * 5. Update event_collaborators relationships if needed
 * 
 * Currently returns 501 Not Implemented. Will be built when modular billing ships.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requirePlatformAdmin();
    const { id } = await params;

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NOT_IMPLEMENTED",
          message: "Cambio de tipo de organización no implementado aún. Fase 2 del plan de unificación.",
          organizationId: parseInt(id, 10),
          requiredSteps: [
            "Cancelar suscripción Stripe actual",
            "Asignar plan compatible con nuevo orgType",
            "Remapear roles de equipo al nuevo orgType",
            "Resetear estado de verificación",
            "Actualizar relaciones de colaboradores",
          ],
        },
      },
      { status: 501 }
    );
  }, "POST /api/admin/tenants/[id]/change-type");
}
