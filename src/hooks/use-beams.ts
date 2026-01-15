"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import * as PusherPushNotifications from "@pusher/push-notifications-web";

let beamsClient: PusherPushNotifications.Client | null = null;
let beamsInitFailed = false;

function getBeamsClient(): PusherPushNotifications.Client | null {
  if (beamsInitFailed) return null;
  
  if (!beamsClient) {
    const instanceId = process.env.NEXT_PUBLIC_PUSHER_BEAMS_INSTANCE_ID;
    
    if (!instanceId) {
      console.warn("Pusher Beams not configured - push notifications disabled");
      beamsInitFailed = true;
      return null;
    }

    try {
      beamsClient = new PusherPushNotifications.Client({
        instanceId,
      });
    } catch (error) {
      console.warn("Failed to initialize Pusher Beams:", error);
      beamsInitFailed = true;
      return null;
    }
  }
  
  return beamsClient;
}

export function useBeams() {
  const { data: session, status } = useSession();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermissionState(Notification.permission);
    }
  }, []);

  // Register user with Beams when authenticated
  useEffect(() => {
    const userId = session?.user?.id;
    if (status !== "authenticated" || !userId || !isSupported) return;
    if (permissionState !== "granted") return;

    const client = getBeamsClient();
    if (!client) return;

    const registerUser = async () => {
      try {
        // Get Beams token from our API
        const tokenRes = await fetch("/api/pusher/beams-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        if (!tokenRes.ok) {
          console.error("Failed to get Beams token");
          return;
        }

        const { token } = await tokenRes.json();

        // Start Beams client with authenticated user
        await client.start();
        
        // Set user ID for targeted notifications
        await client.setUserId(userId, {
          fetchToken: async () => token,
        });

        setIsRegistered(true);
        console.log("Pusher Beams registered for user:", userId);
      } catch (error) {
        console.error("Failed to register with Pusher Beams:", error);
      }
    };

    registerUser();

    return () => {
      // Cleanup on unmount
      client.stop().catch(() => {});
    };
  }, [session?.user?.id, status, isSupported, permissionState]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      return permission === "granted";
    } catch (error) {
      console.error("Failed to request notification permission:", error);
      return false;
    }
  }, [isSupported]);

  // Subscribe to a topic/interest (e.g., task-123, event-456)
  const subscribeToInterest = useCallback(async (interest: string): Promise<boolean> => {
    const client = getBeamsClient();
    if (!client || !isRegistered) return false;

    try {
      await client.addDeviceInterest(interest);
      return true;
    } catch (error) {
      console.error("Failed to subscribe to interest:", error);
      return false;
    }
  }, [isRegistered]);

  // Unsubscribe from a topic/interest
  const unsubscribeFromInterest = useCallback(async (interest: string): Promise<boolean> => {
    const client = getBeamsClient();
    if (!client || !isRegistered) return false;

    try {
      await client.removeDeviceInterest(interest);
      return true;
    } catch (error) {
      console.error("Failed to unsubscribe from interest:", error);
      return false;
    }
  }, [isRegistered]);

  // Get current interests
  const getInterests = useCallback(async (): Promise<string[]> => {
    const client = getBeamsClient();
    if (!client || !isRegistered) return [];

    try {
      return await client.getDeviceInterests();
    } catch (error) {
      console.error("Failed to get interests:", error);
      return [];
    }
  }, [isRegistered]);

  return {
    isSupported,
    isRegistered,
    permissionState,
    requestPermission,
    subscribeToInterest,
    unsubscribeFromInterest,
    getInterests,
  };
}

// Hook to prompt user for notification permission
export function useNotificationPrompt() {
  const { isSupported, permissionState, requestPermission } = useBeams();
  const [dismissed, setDismissed] = useState(false);

  // Check if we should show the prompt
  const shouldShowPrompt = isSupported && 
    permissionState === "default" && 
    !dismissed;

  const dismiss = useCallback(() => {
    setDismissed(true);
    // Store in localStorage to not show again for a while
    localStorage.setItem("notification-prompt-dismissed", Date.now().toString());
  }, []);

  // Check localStorage on mount
  useEffect(() => {
    const dismissedAt = localStorage.getItem("notification-prompt-dismissed");
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        setDismissed(true);
      }
    }
  }, []);

  return {
    shouldShowPrompt,
    requestPermission,
    dismiss,
  };
}
