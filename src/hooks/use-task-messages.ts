"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePrivateChannel } from "./use-pusher";
import { EVENTS } from "@/lib/pusher";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface TaskMessage {
  id: number;
  taskId: number;
  senderId: string;
  senderName?: string;
  senderEmail?: string;
  senderImage?: string;
  type: string;
  content: string;
  isPrivate: boolean;
  visibleTo: string[] | null;
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
  deletedAt: string | null;
  attachments?: TaskMessageAttachment[];
  emailFrom?: string | null;
  emailTo?: string[] | null;
  emailCc?: string[] | null;
  emailBcc?: string[] | null;
  emailSubject?: string | null;
  emailThreadId?: string | null;
  emailMessageId?: string | null;
  whatsappTo?: string | null;
  whatsappFrom?: string | null;
  whatsappTemplate?: string | null;
  whatsappMessageId?: string | null;
}

interface TaskMessageAttachment {
  id: number;
  name: string;
  url: string;
  type: string;
  size: number | null;
  mimeType: string | null;
}

export function useTaskMessages(taskId: number | null, options?: { showNotifications?: boolean }) {
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [isRealtime, setIsRealtime] = useState(false);
  const [canComment, setCanComment] = useState(true);
  const lastMessageIdRef = useRef<number | null>(null);
  const { data: session } = useSession();
  const showNotifications = options?.showNotifications ?? true;

  // Pusher channel for real-time updates
  const channelName = taskId ? `private-task-${taskId}` : null;
  const { channel, bind } = usePrivateChannel(channelName);

  const fetchMessages = useCallback(async () => {
    if (!taskId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/messages`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
        if (typeof data.canComment === "boolean") {
          setCanComment(data.canComment);
        }
        // Track last message ID for deduplication
        if (data.data.length > 0) {
          lastMessageIdRef.current = data.data[data.data.length - 1].id;
        }
      } else {
        setError(data.error?.message || "Failed to fetch messages");
      }
    } catch (err) {
      setError("Failed to fetch messages");
      console.error("Failed to fetch messages:", err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time message updates via Pusher
  useEffect(() => {
    if (!channel) {
      setIsRealtime(false);
      return;
    }

    setIsRealtime(true);

    // New message received
    const unbindNew = bind<TaskMessage>(EVENTS.MESSAGE_NEW, (newMessage) => {
      setMessages(prev => {
        // Avoid duplicates - check if we already have this message
        if (prev.some(m => m.id === newMessage.id)) {
          return prev;
        }
        // Check if there's a pending optimistic message from the same sender with same content
        const optimisticIdx = prev.findIndex(m => m.id < 0 && m.senderId === newMessage.senderId && m.content === newMessage.content);
        if (optimisticIdx !== -1) {
          // Replace optimistic with real message
          const updated = [...prev];
          updated[optimisticIdx] = newMessage;
          return updated;
        }
        return [...prev, newMessage];
      });
      lastMessageIdRef.current = newMessage.id;

      // Show toast notification for messages from other users
      if (showNotifications && newMessage.senderId !== session?.user?.id) {
        const senderName = newMessage.senderName || newMessage.senderEmail?.split("@")[0] || "Alguien";
        const preview = newMessage.content.length > 50 
          ? newMessage.content.substring(0, 50) + "..." 
          : newMessage.content;
        
        toast.message(`💬 ${senderName}`, {
          description: preview,
          duration: 4000,
        });
      }
    });

    // Message edited
    const unbindEdit = bind<TaskMessage>(EVENTS.MESSAGE_EDITED, (editedMessage) => {
      setMessages(prev => 
        prev.map(m => m.id === editedMessage.id ? editedMessage : m)
      );
    });

    // Message deleted
    const unbindDelete = bind<{ id: number }>(EVENTS.MESSAGE_DELETED, (data) => {
      setMessages(prev => prev.filter(m => m.id !== data.id));
    });

    // File uploaded (refresh to get attachment info)
    const unbindFile = bind<{ messageId: number }>(EVENTS.FILE_UPLOADED, () => {
      // Refetch to get full attachment data
      fetchMessages();
    });

    return () => {
      unbindNew?.();
      unbindEdit?.();
      unbindDelete?.();
      unbindFile?.();
    };
  }, [channel, bind, fetchMessages]);

  // Fallback polling: only if Pusher is not connected (every 15 seconds)
  useEffect(() => {
    if (!taskId || isRealtime) return;
    
    const interval = setInterval(() => {
      // Silent fetch - don't show loading state
      fetch(`/api/tasks/${taskId}/messages`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setMessages(data.data);
          }
        })
        .catch(() => {}); // Silent fail for polling
    }, 15000); // 15 seconds fallback when Pusher is not connected

    return () => clearInterval(interval);
  }, [taskId, isRealtime]);

  // Send message with optimistic UI
  const sendMessage = useCallback(async (messageData: {
    content: string;
    type?: string;
    isPrivate?: boolean;
    visibleTo?: string[];
  }) => {
    if (!taskId) return null;
    
    setSending(true);

    // Optimistic: add message to local state immediately
    const tempId = -Date.now();
    const optimisticMessage: TaskMessage = {
      id: tempId,
      taskId,
      senderId: session?.user?.id || "",
      senderName: session?.user?.name || session?.user?.email || "Tú",
      senderEmail: session?.user?.email || undefined,
      senderImage: session?.user?.image || undefined,
      type: messageData.type || "text",
      content: messageData.content,
      isPrivate: messageData.isPrivate || false,
      visibleTo: messageData.visibleTo || null,
      isEdited: false,
      editedAt: null,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };

    setMessages(prev => [...prev, optimisticMessage]);
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });
      const data = await res.json();
      if (data.success) {
        // Replace optimistic message with real one, or remove temp if Pusher already delivered it
        setMessages(prev => {
          const hasReal = prev.some(m => m.id === data.data.id);
          if (hasReal) {
            // Pusher already delivered the real message — just remove the temp
            return prev.filter(m => m.id !== tempId);
          }
          // Replace temp with real
          return prev.map(m => m.id === tempId ? { ...data.data, createdAt: data.data.createdAt || optimisticMessage.createdAt } : m);
        });
        lastMessageIdRef.current = data.data.id;
        return data.data;
      }
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      console.error("Failed to send message - API error:", data.error);
      throw new Error(data.error?.message || "Failed to send message");
    } catch (err) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      console.error("Failed to send message:", err);
      throw err;
    } finally {
      setSending(false);
    }
  }, [taskId, session]);

  // Edit message
  const editMessage = useCallback(async (messageId: number, content: string) => {
    if (!taskId) return null;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, content }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchMessages();
        return data.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to edit message:", err);
      return null;
    }
  }, [taskId, fetchMessages]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: number) => {
    if (!taskId) return false;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/messages?messageId=${messageId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await fetchMessages();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to delete message:", err);
      return false;
    }
  }, [taskId, fetchMessages]);

  return {
    messages,
    loading,
    error,
    sending,
    isRealtime,
    canComment,
    refetch: fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
  };
}
