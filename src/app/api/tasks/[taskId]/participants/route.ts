import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireEventSectionAccess } from "@/lib/session";
import { 
  addTaskParticipant, 
  removeTaskParticipant, 
  updateTaskParticipant,
  getTaskParticipants 
} from "@/lib/invitations";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notifyAddedAsParticipant } from "@/lib/push-notifications";
import { ensureVendorForProviderOrg } from "@/lib/cross-org";

type RouteParams = { params: Promise<{ taskId: string }> };

// GET /api/tasks/[taskId]/participants - List task participants
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission("tasks:read");
    const { taskId } = await params;

    const participants = await getTaskParticipants(parseInt(taskId, 10));

    return NextResponse.json({
      success: true,
      data: participants,
    });
  } catch (error) {
    console.error("GET /api/tasks/[taskId]/participants error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch participants";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}

async function enforceTaskEditAccess(taskIdNum: number, organizationId: number, eventScoped: boolean): Promise<void> {
  if (!eventScoped) return;
  const task = await db.query.tasks.findFirst({
    where: (t, { eq, and }) => and(eq(t.id, taskIdNum), eq(t.organizationId, organizationId)),
    columns: { eventId: true },
  });
  if (task?.eventId) {
    await requireEventSectionAccess(task.eventId, "tasks", "edit");
  }
}

// POST /api/tasks/[taskId]/participants - Add participant to task (user or vendor)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    await enforceTaskEditAccess(parseInt(taskId, 10), session.organizationId, session.eventScoped);
    const body = await request.json();

    const { userId, vendorId, contactId, providerOrgId, type, canEdit, canComment } = body;

    if (!userId && !vendorId && !contactId && !providerOrgId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId, vendorId, contactId, or providerOrgId is required" } },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "type is required" } },
        { status: 400 }
      );
    }

    let resolvedVendorId = vendorId;

    if (providerOrgId && !vendorId) {
      resolvedVendorId = await ensureVendorForProviderOrg(
        session.organizationId,
        providerOrgId,
        session.user.userId,
      );
    }

    const participant = await addTaskParticipant(session, parseInt(taskId, 10), {
      userId,
      vendorId: resolvedVendorId,
      contactId,
      type,
      canEdit,
      canComment,
    });

    // Send push notification if a user was added (not vendor/contact)
    if (userId) {
      const task = await db.query.tasks.findFirst({
        where: (t, { eq }) => eq(t.id, parseInt(taskId, 10)),
        columns: { title: true },
      });
      if (task) {
        const addedByName = session.user.name || "Alguien";
        notifyAddedAsParticipant(
          parseInt(taskId, 10),
          task.title,
          userId,
          addedByName
        ).catch(err => console.error("Push notification failed:", err));
      }
    }

    return NextResponse.json({
      success: true,
      data: participant,
    });
  } catch (error) {
    console.error("POST /api/tasks/[taskId]/participants error:", error);
    const message = error instanceof Error ? error.message : "Failed to add participant";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : message.includes("already") ? 409 : 400;
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status }
    );
  }
}

// PATCH /api/tasks/[taskId]/participants - Update participant permissions
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    await enforceTaskEditAccess(parseInt(taskId, 10), session.organizationId, session.eventScoped);
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
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    await enforceTaskEditAccess(parseInt(taskId, 10), session.organizationId, session.eventScoped);
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
