"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  RiSendPlaneLine,
  RiAttachment2,
  RiLockLine,
} from "@remixicon/react";
import { useTaskMessages } from "@/hooks/use-task-messages";
import { TaskChatMessage } from "./task-chat-message";

interface TaskChatProps {
  taskId: number | null;
}

export function TaskChat({ taskId }: TaskChatProps) {
  const { messages, loading, sending, sendMessage } = useTaskMessages(taskId);
  const [newMessage, setNewMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    await sendMessage({
      content: newMessage.trim(),
      type: "text",
      isPrivate,
    });

    setNewMessage("");
    setIsPrivate(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!taskId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Selecciona una tarea para ver el chat
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h3 className="font-medium text-sm">Comentarios</h3>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p className="text-sm">No hay comentarios aún</p>
            <p className="text-xs mt-1">Sé el primero en comentar</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <TaskChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border shrink-0 space-y-3">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Añade un comentario..."
          className="min-h-[80px] resize-none"
          disabled={sending}
        />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Private toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="private-mode"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
                className="scale-75"
              />
              <label
                htmlFor="private-mode"
                className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer"
              >
                <RiLockLine className="h-3 w-3" />
                Comentario Privado
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Attachment button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={sending}
            >
              <RiAttachment2 className="h-4 w-4" />
            </Button>

            {/* Send button */}
            <Button
              type="button"
              size="icon"
              className="h-8 w-8"
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
            >
              <RiSendPlaneLine className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
