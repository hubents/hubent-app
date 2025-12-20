import { NextResponse } from "next/server";
import { initializeSystem, isSystemInitialized } from "@/lib/system-init";

/**
 * GET /api/system/init
 * Check if system is initialized
 */
export async function GET() {
  try {
    const initialized = await isSystemInitialized();
    return NextResponse.json({ initialized });
  } catch (error) {
    console.error("System check error:", error);
    return NextResponse.json(
      { error: "Failed to check system status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/system/init
 * Initialize system data (roles, plans, permissions)
 */
export async function POST() {
  try {
    const result = await initializeSystem();
    
    const totalCreated = 
      result.roles.created.length + 
      result.plans.created.length + 
      result.permissions.created.length;

    return NextResponse.json({
      success: true,
      message: totalCreated > 0 
        ? `System initialized: ${totalCreated} items created`
        : "System already initialized",
      details: result,
    });
  } catch (error) {
    console.error("System init error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Initialization failed" },
      { status: 500 }
    );
  }
}
