import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { 
  addTaskParticipant, 
  removeTaskParticipant, 
  updateTaskParticipant,
  getTaskParticipants 
} from "@/lib/invitations";

type RouteParams = { params: Promise<{ taskId: string }> };

// GET /api/tasks/[taskId]/participants - List task participants
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireRole("viewer");
    const { taskId } = await params;

    const participants = await getTaskParticipants(parseInt(taskId, 10));

    return NextResponse.json({
      success: true,
      data: participants,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch participants";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[taskId]/participants - Add participant to task
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { taskId } = await params;
    const body = await request.json();

    const { userId, type, canEdit, canComment } = body;

    if (!userId || !type) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId and type are required" } },
        { status: 400 }
      );
    }

    const participant = await addTaskParticipant(session, parseInt(taskId, 10), {
      userId,
      type,
      canEdit,
      canComment,
    });

    return NextResponse.json({
      success: true,
      data: participant,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add participant";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// PATCH /api/tasks/[taskId]/participants - Update participant permissions
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { taskId } = await params;
    const body = await request.json();

    const { participantId, canEdit, canComment } = body;

    if (!participantId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "participantId is required" } },
        { status: 400 }
      );
    }

    const updated = await updateTaskParticipant(
      session, 
      parseInt(taskId, 10), 
      participantId,
      { canEdit, canComment }
    );

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update participant";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/tasks/[taskId]/participants - Remove participant from task
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get("participantId");

    if (!participantId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "participantId is required" } },
        { status: 400 }
      );
    }

    await removeTaskParticipant(
      session, 
      parseInt(taskId, 10), 
      parseInt(participantId, 10)
    );

    return NextResponse.json({
      success: true,
      data: { message: "Participant removed" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove participant";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
