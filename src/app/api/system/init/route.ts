import { initializeSystem, isSystemInitialized } from "@/lib/system-init";
import { apiHandler, ok } from "@/lib/api-handler";

/**
 * GET /api/system/init
 * Check if system is initialized
 */
export async function GET() {
  return apiHandler(async () => {
    const initialized = await isSystemInitialized();
    return ok({ initialized });
  }, "GET /api/system/init");
}

/**
 * POST /api/system/init
 * Initialize system data (roles, plans, permissions)
 */
export async function POST() {
  return apiHandler(async () => {
    const result = await initializeSystem();

    const totalCreated =
      result.roles.created.length +
      result.plans.created.length +
      result.permissions.created.length;

    return ok({
      message: totalCreated > 0
        ? `System initialized: ${totalCreated} items created`
        : "System already initialized",
      details: result,
    });
  }, "POST /api/system/init");
}
