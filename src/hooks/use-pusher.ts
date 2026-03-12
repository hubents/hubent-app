"use client";

/**
 * Pusher Client Hook
 * 
 * Provides real-time connection to Pusher channels for task chat,
 * presence tracking, and notifications.
 * 
 * IMPORTANT: All Pusher functionality is OPTIONAL and fails silently.
 * The app must work without Pusher.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type Pusher from "pusher-js";
import type { Channel, PresenceChannel } from "pusher-js";
import { useSession } from "next-auth/react";

// Singleton Pusher instance
let pusherInstance: Pusher | null = null;
let pusherInitFailed = false;

// Reference counting for shared channel subscriptions
const channelSubscriptions = new Map<string, { channel: Channel; refCount: number }>();

function getPusherClient(): Pusher | null {
  // If init already failed, don't retry
  if (pusherInitFailed) return null;
  
  if (!pusherInstance) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) {
      console.warn("Pusher not configured - real-time features disabled");
      pusherInitFailed = true;
      return null;
    }

    try {
      // Dynamic import to avoid issues if pusher-js has problems
      const PusherJS = require("pusher-js");
      pusherInstance = new PusherJS(key, {
        cluster,
        authEndpoint: "/api/pusher/auth",
      });

      // Disable logging in production
      if (process.env.NODE_ENV !== "development") {
        PusherJS.logToConsole = false;
      }
    } catch (error) {
      console.warn("Failed to initialize Pusher:", error);
      pusherInitFailed = true;
      return null;
    }
  }
  return pusherInstance;
}

// Connection state
export type ConnectionState = "connecting" | "connected" | "disconnected" | "failed";

export function usePusherConnection() {
  const [state, setState] = useState<ConnectionState>("disconnected");
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    pusher.connection.bind("state_change", (states: { current: string }) => {
      setState(states.current as ConnectionState);
    });

    // Set initial state
    setState(pusher.connection.state as ConnectionState);

    return () => {
      pusher.connection.unbind("state_change");
    };
  }, [session]);

  return state;
}

// Subscribe to a private channel (for task chat)
// Uses reference counting so multiple hooks can share the same channel safely
export function usePrivateChannel(channelName: string | null) {
  const channelRef = useRef<Channel | null>(null);
  const [channelState, setChannelState] = useState<Channel | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (!channelName || !session?.user) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    try {
      const existing = channelSubscriptions.get(channelName);

      if (existing) {
        // Channel already subscribed by another hook — just increment refCount
        existing.refCount++;
        channelRef.current = existing.channel;
        setChannelState(existing.channel);
      } else {
        // First subscriber — actually subscribe
        const channel = pusher.subscribe(channelName);
        channelSubscriptions.set(channelName, { channel, refCount: 1 });
        channelRef.current = channel;

        channel.bind("pusher:subscription_succeeded", () => {
          setChannelState(channel);
        });

        channel.bind("pusher:subscription_error", (error: { status: number }) => {
          console.warn(`Pusher subscription failed for ${channelName}:`, error.status);
          setChannelState(null);
        });

        // If channel is already subscribed (e.g. reconnect), set state immediately
        if ((channel as unknown as { subscribed: boolean }).subscribed) {
          setChannelState(channel);
        }
      }

      return () => {
        const sub = channelSubscriptions.get(channelName);
        if (sub) {
          sub.refCount--;
          if (sub.refCount <= 0) {
            // Last consumer — actually unsubscribe
            pusher.unsubscribe(channelName);
            channelSubscriptions.delete(channelName);
          }
        }
        channelRef.current = null;
        setChannelState(null);
      };
    } catch (error) {
      console.warn("Pusher client not available:", error);
      return;
    }
  }, [channelName, session?.user?.id]);

  const bind = useCallback(<T>(event: string, callback: (data: T) => void) => {
    channelRef.current?.bind(event, callback);
    return () => channelRef.current?.unbind(event, callback);
  }, []);

  const trigger = useCallback((event: string, data: unknown) => {
    // Client events must start with "client-"
    if (event.startsWith("client-")) {
      channelRef.current?.trigger(event, data);
    }
  }, []);

  return { channel: channelState, bind, trigger };
}

// Presence channel for showing who's viewing a task
export interface PresenceMember {
  id: string;
  info: {
    name: string;
    email: string;
    image?: string;
  };
}

// Reference counting for presence channels (separate from private channels)
const presenceSubscriptions = new Map<string, { channel: PresenceChannel; refCount: number }>();

export function usePresenceChannel(channelName: string | null) {
  const channelRef = useRef<PresenceChannel | null>(null);
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [me, setMe] = useState<PresenceMember | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (!channelName || !session?.user) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    try {
      const existing = presenceSubscriptions.get(channelName);

      if (existing) {
        existing.refCount++;
        channelRef.current = existing.channel;
      } else {
        const channel = pusher.subscribe(channelName) as PresenceChannel;
        presenceSubscriptions.set(channelName, { channel, refCount: 1 });
        channelRef.current = channel;

        channel.bind("pusher:subscription_error", (error: { status: number }) => {
          console.warn(`Pusher presence subscription failed for ${channelName}:`, error.status);
        });

        channel.bind("pusher:subscription_succeeded", (data: { members: Record<string, PresenceMember["info"]>; me: { id: string; info: PresenceMember["info"] } }) => {
          const memberList: PresenceMember[] = [];
          Object.entries(data.members).forEach(([id, info]) => {
            memberList.push({ id, info });
          });
          setMembers(memberList);
          setMe({ id: data.me.id, info: data.me.info });
        });

        channel.bind("pusher:member_added", (member: PresenceMember) => {
          setMembers(prev => [...prev.filter(m => m.id !== member.id), member]);
        });

        channel.bind("pusher:member_removed", (member: PresenceMember) => {
          setMembers(prev => prev.filter(m => m.id !== member.id));
        });
      }

      return () => {
        const sub = presenceSubscriptions.get(channelName);
        if (sub) {
          sub.refCount--;
          if (sub.refCount <= 0) {
            pusher.unsubscribe(channelName);
            presenceSubscriptions.delete(channelName);
          }
        }
        channelRef.current = null;
        setMembers([]);
        setMe(null);
      };
    } catch (error) {
      console.warn("Pusher client not available:", error);
      return;
    }
  }, [channelName, session?.user?.id]);

  const bind = useCallback(<T>(event: string, callback: (data: T) => void) => {
    channelRef.current?.bind(event, callback);
    return () => channelRef.current?.unbind(event, callback);
  }, []);

  const trigger = useCallback((event: string, data: unknown) => {
    if (event.startsWith("client-")) {
      channelRef.current?.trigger(event, data);
    }
  }, []);

  return { channel: channelRef.current, members, me, bind, trigger };
}

// Hook for user notifications channel
export function useUserNotifications(onNotification?: (data: unknown) => void) {
  const { data: session } = useSession();
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    try {
      const channelName = `private-user-${session.user.id}`;
      const channel = pusher.subscribe(channelName);
      channelRef.current = channel;

      // Handle subscription error
      channel.bind("pusher:subscription_error", (error: { status: number }) => {
        console.warn(`Pusher user notifications subscription failed:`, error.status);
      });

      // Bind to all notification events
      const events = [
        "task:assigned",
        "task:updated",
        "task:comment",
        "event:updated",
        "event:new",
        "rsvp:received",
        "contact:new",
        "lead:new",
        "payment:new",
        "document:received",
      ];

      events.forEach(event => {
        channel.bind(event, (data: unknown) => {
          onNotification?.(data);
        });
      });

      return () => {
        pusher.unsubscribe(channelName);
        channelRef.current = null;
      };
    } catch (error) {
      console.warn("Pusher client not available:", error);
      return;
    }
  }, [session?.user?.id, onNotification]);

  return channelRef.current;
}

// Typing indicator hook
export interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

export function useTypingIndicator(channelName: string | null) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const { channel, bind, trigger } = usePrivateChannel(channelName);
  const { data: session } = useSession();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for typing events
  useEffect(() => {
    if (!channel) return;

    const unbind = bind<{ userId: string; userName: string; isTyping: boolean }>(
      "client-typing",
      (data) => {
        if (data.isTyping) {
          setTypingUsers(prev => {
            const filtered = prev.filter(u => u.userId !== data.userId);
            return [...filtered, { ...data, timestamp: Date.now() }];
          });
        } else {
          setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
        }
      }
    );

    return () => { unbind?.(); };
  }, [channel, bind]);

  // Clean up stale typing indicators (older than 3 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => prev.filter(u => now - u.timestamp < 3000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Send typing indicator
  const setTyping = useCallback((isTyping: boolean) => {
    if (!session?.user?.id) return;

    const userId = session.user.id;
    const userName = session.user.name || session.user.email || "Usuario";

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    trigger("client-typing", {
      userId,
      userName,
      isTyping,
    });

    // Auto-stop typing after 2 seconds of no activity
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        trigger("client-typing", {
          userId,
          userName,
          isTyping: false,
        });
      }, 2000);
    }
  }, [session, trigger]);

  // Filter out current user from typing list
  const othersTyping = typingUsers.filter(u => u.userId !== session?.user?.id);

  return { typingUsers: othersTyping, setTyping };
}
