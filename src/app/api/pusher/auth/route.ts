/**
 * Pusher Authentication Endpoint
 * 
 * Authorizes users to subscribe to private and presence channels.
 * CRITICAL: Only task participants can access task channels.
 * 
 * Pusher sends data as application/x-www-form-urlencoded
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { organizationMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { canAccessTaskFor } from "@/lib/task-access";
import Pusher from "pusher";

// Create Pusher instance inside the handler to ensure env vars are available
function createPusherServer(): Pusher | null {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    console.error("Pusher config missing:", { appId: !!appId, key: !!key, secret: !!secret, cluster: !!cluster });
    return null;
  }

  return new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse the request body - Pusher sends as application/x-www-form-urlencoded
    const text = await request.text();
    const params = new URLSearchParams(text);
    const socketId = params.get("socket_id");
    const channelName = params.get("channel_name");

    if (!socketId || !channelName) {
      return new Response(JSON.stringify({ error: "Missing socket_id or channel_name" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const pusher = createPusherServer();
    if (!pusher) {
      return new Response(JSON.stringify({ error: "Pusher not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle different channel types
    if (channelName.startsWith("private-task-")) {
      const taskId = parseInt(channelName.replace("private-task-", ""), 10);
      const hasAccess = await verifyTaskAccess(session.user.id, taskId);

      if (!hasAccess) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      const authResponse = pusher.authorizeChannel(socketId, channelName);
      return new Response(JSON.stringify(authResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (channelName.startsWith("presence-task-")) {
      const taskId = parseInt(channelName.replace("presence-task-", ""), 10);
      const hasAccess = await verifyTaskAccess(session.user.id, taskId);

      if (!hasAccess) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      const presenceData = {
        user_id: session.user.id,
        user_info: {
          name: session.user.name || session.user.email || "Usuario",
          email: session.user.email || "",
          image: session.user.image || undefined,
        },
      };

      const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);
      return new Response(JSON.stringify(authResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (channelName.startsWith("private-user-")) {
      const userId = channelName.replace("private-user-", "");
      
      if (userId !== session.user.id) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      const authResponse = pusher.authorizeChannel(socketId, channelName);
      return new Response(JSON.stringify(authResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (channelName.startsWith("private-org-")) {
      const orgId = parseInt(channelName.replace("private-org-", ""), 10);
      const hasAccess = await verifyOrgAccess(session.user.id, orgId);
      
      if (!hasAccess) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      const authResponse = pusher.authorizeChannel(socketId, channelName);
      return new Response(JSON.stringify(authResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Unknown channel type - return 403 instead of 400 to avoid Pusher retries
    return new Response(JSON.stringify({ error: "Unknown channel type" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Pusher auth error:", error);
    return new Response(JSON.stringify({ error: "Authentication failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verify if user has access to a task chat channel.
 * Delegates to canAccessTaskFor to ensure consistency with HTTP message/attachment routes.
 *
 * Resolves the user's organization via the active session (cookie/header). When that fails
 * (e.g. user has multiple orgs and no active selection), no Pusher subscription is granted —
 * the user can still read/write via HTTP, just without realtime updates for that tab.
 */
async function verifyTaskAccess(userId: string, taskId: number): Promise<boolean> {
  const tenantSession = await getSession();
  if (!tenantSession || tenantSession.user.userId !== userId) return false;

  const access = await canAccessTaskFor({
    userId,
    organizationId: tenantSession.organizationId,
    role: tenantSession.role,
    taskId,
  });
  return access.canRead;
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
