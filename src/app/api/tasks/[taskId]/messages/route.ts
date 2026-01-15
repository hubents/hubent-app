import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { 
  getTaskMessages, 
  sendTaskMessage, 
  editTaskMessage,
  deleteTaskMessage,
  canAccessTaskChat
} from "@/lib/task-chat";

type RouteParams = { params: Promise<{ taskId: string }> };

// GET /api/tasks/[taskId]/messages - Get task messages
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Check access
    const canAccess = await canAccessTaskChat(session, parseInt(taskId, 10));
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You don't have access to this task" } },
        { status: 403 }
      );
    }

    const messages = await getTaskMessages(session, parseInt(taskId, 10), {
      limit,
      offset,
      includePrivate: true,
    });

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch messages";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[taskId]/messages - Send a message
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { taskId } = await params;
    const body = await request.json();

    const { content, type, isPrivate, visibleTo } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Message content is required" } },
        { status: 400 }
      );
    }

    const message = await sendTaskMessage(session, parseInt(taskId, 10), {
      content,
      type,
      isPrivate,
      visibleTo,
    });

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("POST /api/tasks/[taskId]/messages error:", error);
    const message = error instanceof Error ? error.message : "Failed to send message";
    // Use 403 for permission errors, 400 for validation, 500 for others
    let status = 500;
    if (message.includes("access") || message.includes("permission")) {
      status = 403;
    } else if (message.includes("required") || message.includes("invalid")) {
      status = 400;
    }
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status }
    );
  }
}

// PATCH /api/tasks/[taskId]/messages - Edit a message
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { messageId, content } = body;

    if (!messageId || !content) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "messageId and content are required" } },
        { status: 400 }
      );
    }

    const updated = await editTaskMessage(session, messageId, content);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to edit message";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/tasks/[taskId]/messages - Delete a message
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");

    if (!messageId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "messageId is required" } },
        { status: 400 }
      );
    }

    await deleteTaskMessage(session, parseInt(messageId, 10));

    return NextResponse.json({
      success: true,
      data: { message: "Message deleted" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete message";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
