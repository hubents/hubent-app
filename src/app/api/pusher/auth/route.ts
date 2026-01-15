/**
 * Pusher Authentication Endpoint
 * 
 * Authorizes users to subscribe to private and presence channels.
 * CRITICAL: Only task participants can access task channels.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { taskParticipants, tasks, organizationMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getPusherServer } from "@/lib/pusher";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const socketId = formData.get("socket_id") as string;
    const channelName = formData.get("channel_name") as string;

    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: "Missing socket_id or channel_name" },
        { status: 400 }
      );
    }

    const pusher = getPusherServer();

    // Handle different channel types
    if (channelName.startsWith("private-task-")) {
      // Task chat channel - verify participant access
      const taskId = parseInt(channelName.replace("private-task-", ""), 10);
      const hasAccess = await verifyTaskAccess(session.user.id, taskId);
      
      if (!hasAccess) {
        return NextResponse.json(
          { error: "Not authorized to access this task" },
          { status: 403 }
        );
      }

      const authResponse = pusher.authorizeChannel(socketId, channelName);
      return NextResponse.json(authResponse);
    }

    if (channelName.startsWith("presence-task-")) {
      // Task presence channel - verify participant access
      const taskId = parseInt(channelName.replace("presence-task-", ""), 10);
      const hasAccess = await verifyTaskAccess(session.user.id, taskId);
      
      if (!hasAccess) {
        return NextResponse.json(
          { error: "Not authorized to access this task" },
          { status: 403 }
        );
      }

      // For presence channels, include user info
      const presenceData = {
        user_id: session.user.id,
        user_info: {
          name: session.user.name || session.user.email || "Usuario",
          email: session.user.email || "",
          image: session.user.image || undefined,
        },
      };

      const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);
      return NextResponse.json(authResponse);
    }

    if (channelName.startsWith("private-user-")) {
      // User notification channel - only the user themselves
      const userId = channelName.replace("private-user-", "");
      
      if (userId !== session.user.id) {
        return NextResponse.json(
          { error: "Not authorized to access this channel" },
          { status: 403 }
        );
      }

      const authResponse = pusher.authorizeChannel(socketId, channelName);
      return NextResponse.json(authResponse);
    }

    if (channelName.startsWith("private-org-")) {
      // Organization channel - verify membership
      const orgId = parseInt(channelName.replace("private-org-", ""), 10);
      const hasAccess = await verifyOrgAccess(session.user.id, orgId);
      
      if (!hasAccess) {
        return NextResponse.json(
          { error: "Not authorized to access this organization" },
          { status: 403 }
        );
      }

      const authResponse = pusher.authorizeChannel(socketId, channelName);
      return NextResponse.json(authResponse);
    }

    // Unknown channel type
    return NextResponse.json(
      { error: "Unknown channel type" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}

/**
 * Verify if user has access to a task
 * User must be:
 * - The task assignee
 * - A participant of the task
 * - The task creator (if we track that)
 */
async function verifyTaskAccess(userId: string, taskId: number): Promise<boolean> {
  // Check if user is assignee
  const [task] = await db
    .select({ assignedTo: tasks.assignedTo })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (task?.assignedTo === userId) {
    return true;
  }

  // Check if user is a participant
  const [participant] = await db
    .select({ userId: taskParticipants.userId })
    .from(taskParticipants)
    .where(
      and(
        eq(taskParticipants.taskId, taskId),
        eq(taskParticipants.userId, userId)
      )
    )
    .limit(1);

  return !!participant;
}

/**
 * Verify if user is member of an organization
 */
async function verifyOrgAccess(userId: string, orgId: number): Promise<boolean> {
  const [member] = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, userId)
      )
    )
    .limit(1);

  return !!member;
}
