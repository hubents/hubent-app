"use client";

/**
 * Pusher Client Hook
 * 
 * Provides real-time connection to Pusher channels for task chat,
 * presence tracking, and notifications.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import Pusher, { Channel, PresenceChannel } from "pusher-js";
import { useSession } from "next-auth/react";

// Singleton Pusher instance
let pusherInstance: Pusher | null = null;

function getPusherClient(): Pusher {
  if (!pusherInstance) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) {
      throw new Error("Pusher client configuration is missing");
    }

    pusherInstance = new Pusher(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
      auth: {
        headers: {
          "Content-Type": "application/json",
        },
      },
    });

    // Enable logging in development
    if (process.env.NODE_ENV === "development") {
      Pusher.logToConsole = true;
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
export function usePrivateChannel(channelName: string | null) {
  const channelRef = useRef<Channel | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (!channelName || !session?.user) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    return () => {
      pusher.unsubscribe(channelName);
      channelRef.current = null;
    };
  }, [channelName, session]);

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

  return { channel: channelRef.current, bind, trigger };
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

export function usePresenceChannel(channelName: string | null) {
  const channelRef = useRef<PresenceChannel | null>(null);
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [me, setMe] = useState<PresenceMember | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (!channelName || !session?.user) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(channelName) as PresenceChannel;
    channelRef.current = channel;

    // When subscription succeeds, get initial members
    channel.bind("pusher:subscription_succeeded", (data: { members: Record<string, PresenceMember["info"]>; me: { id: string; info: PresenceMember["info"] } }) => {
      const memberList: PresenceMember[] = [];
      Object.entries(data.members).forEach(([id, info]) => {
        memberList.push({ id, info });
      });
      setMembers(memberList);
      setMe({ id: data.me.id, info: data.me.info });
    });

    // When someone joins
    channel.bind("pusher:member_added", (member: PresenceMember) => {
      setMembers(prev => [...prev.filter(m => m.id !== member.id), member]);
    });

    // When someone leaves
    channel.bind("pusher:member_removed", (member: PresenceMember) => {
      setMembers(prev => prev.filter(m => m.id !== member.id));
    });

    return () => {
      pusher.unsubscribe(channelName);
      channelRef.current = null;
      setMembers([]);
      setMe(null);
    };
  }, [channelName, session]);

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
    const channelName = `private-user-${session.user.id}`;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    // Bind to all notification events
    const events = [
      "task:assigned",
      "task:updated",
      "task:comment",
      "event:updated",
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
