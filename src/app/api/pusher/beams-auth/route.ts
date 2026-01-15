import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import PushNotifications from "@pusher/push-notifications-server";

// Initialize Beams client
function getBeamsClient(): PushNotifications | null {
  const instanceId = process.env.PUSHER_BEAMS_INSTANCE_ID;
  const secretKey = process.env.PUSHER_BEAMS_SECRET_KEY;

  if (!instanceId || !secretKey) {
    return null;
  }

  return new PushNotifications({
    instanceId,
    secretKey,
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    // Verify the requested userId matches the authenticated user
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden - User ID mismatch" },
        { status: 403 }
      );
    }

    const beamsClient = getBeamsClient();
    
    if (!beamsClient) {
      return NextResponse.json(
        { error: "Pusher Beams not configured" },
        { status: 503 }
      );
    }

    // Generate Beams token for the user
    const beamsToken = beamsClient.generateToken(userId);

    return NextResponse.json({
      token: beamsToken.token,
    });
  } catch (error) {
    console.error("Beams auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
