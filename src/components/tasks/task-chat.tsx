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
  RiAtLine,
} from "@remixicon/react";
import { useTaskMessages } from "@/hooks/use-task-messages";
import { TaskChatMessage } from "./task-chat-message";
import { useSession } from "next-auth/react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface TaskChatProps {
  taskId: number | null;
  participants?: Array<{ userId: string; userName?: string; userEmail?: string; userImage?: string }>;
}

export function TaskChat({ taskId, participants = [] }: TaskChatProps) {
  const { data: session } = useSession();
  const { messages, loading, sending, sendMessage, deleteMessage, refetch } = useTaskMessages(taskId);
  const [newMessage, setNewMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch team members for mentions
  useEffect(() => {
    async function fetchTeamMembers() {
      try {
        const res = await fetch("/api/team");
        const data = await res.json();
        if (data.success && data.data) {
          setTeamMembers(data.data);
        } else if (data.members) {
          setTeamMembers(data.members);
        }
      } catch (error) {
        console.error("Failed to fetch team members:", error);
      }
    }
    fetchTeamMembers();
  }, []);

  // Refetch messages when taskId changes
  useEffect(() => {
    if (taskId) {
      refetch();
    }
  }, [taskId, refetch]);

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
    if (e.key === "Enter" && !e.shiftKey && !showMentions) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      setShowMentions(false);
    }
  };

  const handleMessageChange = (value: string) => {
    setNewMessage(value);
    
    // Check for @ mentions
    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const textAfterAt = value.substring(lastAtIndex + 1);
      const hasSpaceAfter = textAfterAt.includes(" ");
      
      if (!hasSpaceAfter && textAfterAt.length <= 20) {
        setMentionSearch(textAfterAt.toLowerCase());
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member: TeamMember) => {
    const lastAtIndex = newMessage.lastIndexOf("@");
    const beforeAt = newMessage.substring(0, lastAtIndex);
    const displayName = member.name || member.email.split("@")[0];
    setNewMessage(`${beforeAt}@${displayName} `);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const filteredMembers = teamMembers.filter(
    (m) =>
      (m.name?.toLowerCase().includes(mentionSearch) ||
        m.email.toLowerCase().includes(mentionSearch)) &&
      m.id !== session?.user?.id
  );

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
              <TaskChatMessage 
                key={message.id} 
                message={message} 
                onDelete={message.senderId === session?.user?.id ? deleteMessage : undefined}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border shrink-0 space-y-3 relative">
        {/* Mentions dropdown */}
        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
            <div className="p-2 text-xs text-muted-foreground border-b border-border">
              Mencionar a...
            </div>
            {filteredMembers.slice(0, 5).map((member) => (
              <button
                key={member.id}
                className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left"
                onClick={() => insertMention(member)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={member.image} />
                  <AvatarFallback className="text-xs">
                    {member.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.name || member.email}</p>
                  {member.name && (
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
        
        <Textarea
          ref={textareaRef}
          value={newMessage}
          onChange={(e) => handleMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Añade un comentario... Usa @ para mencionar"
          className="min-h-20 resize-none"
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
            {/* Mention button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={sending}
              onClick={() => {
                setNewMessage(newMessage + "@");
                setShowMentions(true);
                setMentionSearch("");
                textareaRef.current?.focus();
              }}
              title="Mencionar usuario"
            >
              <RiAtLine className="h-4 w-4" />
            </Button>

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
