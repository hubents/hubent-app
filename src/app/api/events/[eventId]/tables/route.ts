import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getEventTables, createEventTable } from "@/lib/guests";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/tables - List tables with guests
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireRole("viewer");
    const { eventId } = await params;
    
    const tables = await getEventTables(parseInt(eventId, 10));

    return NextResponse.json({
      success: true,
      data: tables,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch tables";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/events/[eventId]/tables - Create table
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireRole("planner");
    const { eventId } = await params;
    const body = await request.json();

    const { name, shape, capacity, positionX, positionY, width, height, color } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name is required" } },
        { status: 400 }
      );
    }

    const table = await createEventTable(parseInt(eventId, 10), {
      name,
      shape,
      capacity,
      positionX,
      positionY,
      width,
      height,
      color,
    });

    return NextResponse.json({
      success: true,
      data: table,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create table";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}
