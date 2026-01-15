"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  RiSendPlaneLine,
  RiAttachment2,
  RiLockLine,
  RiAtLine,
  RiLoader4Line,
  RiCloseLine,
  RiImageLine,
  RiFileTextLine,
} from "@remixicon/react";
import { useTaskMessages } from "@/hooks/use-task-messages";
import { TaskChatMessage } from "./task-chat-message";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Fetch team members for mentions
  useEffect(() => {
    async function fetchTeamMembers() {
      try {
        const res = await fetch("/api/team");
        const data = await res.json();
        if (data.success && data.data?.members) {
          setTeamMembers(data.data.members);
        } else if (data.success && Array.isArray(data.data)) {
          setTeamMembers(data.data);
        } else if (data.members) {
          setTeamMembers(data.members);
        } else {
          setTeamMembers([]);
        }
      } catch (error) {
        console.error("Failed to fetch team members:", error);
        setTeamMembers([]);
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

  const uploadFile = useCallback(async (file: File) => {
    if (!taskId) return;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("El archivo excede el límite de 10MB");
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setPendingFile(null);

    try {
      // 1. Upload file to R2
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "task-attachments");

      setUploadProgress(30);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        throw new Error(uploadData.error?.message || "Error al subir archivo");
      }

      setUploadProgress(60);

      // 2. Send message FIRST to get messageId
      const isImage = file.type.startsWith("image/");
      const messageResult = await sendMessage({
        content: file.name,
        type: "file",
        isPrivate,
      });

      setUploadProgress(80);

      // 3. Save attachment WITH messageId to task_attachments (shows in "Información" tab)
      if (messageResult?.id) {
        const attachRes = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messageId: messageResult.id,
            name: file.name,
            url: uploadData.data.url,
            type: isImage ? "image" : "file",
            size: file.size,
            mimeType: file.type,
          }),
        });

        if (!attachRes.ok) {
          console.error("Failed to save attachment metadata");
        }
      }

      setUploadProgress(100);

      // 4. Refetch messages to show attachment
      await refetch();

      toast.success(isImage ? "Imagen subida correctamente" : "Archivo subido correctamente");
    } catch (error) {
      console.error("Failed to upload file:", error);
      const message = error instanceof Error ? error.message : "Error al subir archivo";
      toast.error(message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [taskId, isPrivate, sendMessage, refetch]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // Show preview for images, upload directly for other files
      if (file.type.startsWith("image/")) {
        setPendingFile(file);
      } else {
        uploadFile(file);
      }
    }
  }, [uploadFile]);

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

  const filteredMembers = (teamMembers || []).filter(
    (m) =>
      (m.name?.toLowerCase().includes(mentionSearch) ||
        m.email?.toLowerCase().includes(mentionSearch)) &&
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
    <div 
      className="flex flex-col h-full"
      ref={dropZoneRef}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg z-50 flex items-center justify-center">
          <div className="text-center">
            <RiImageLine className="h-12 w-12 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-primary">Suelta el archivo aquí</p>
          </div>
        </div>
      )}

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
        {/* Upload progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Subiendo archivo...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1" />
          </div>
        )}

        {/* Pending file preview (for images) */}
        {pendingFile && (
          <div className="relative bg-muted rounded-lg p-3">
            <button
              onClick={() => setPendingFile(null)}
              className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background"
            >
              <RiCloseLine className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              {pendingFile.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(pendingFile)}
                  alt="Preview"
                  className="h-16 w-16 object-cover rounded-lg"
                />
              ) : (
                <div className="h-16 w-16 bg-primary/10 rounded-lg flex items-center justify-center">
                  <RiFileTextLine className="h-8 w-8 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pendingFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(pendingFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => uploadFile(pendingFile)}
                disabled={uploading}
              >
                {uploading ? (
                  <RiLoader4Line className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                Subir
              </Button>
            </div>
          </div>
        )}

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
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={handleFileUpload}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={sending || uploading}
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar archivo"
            >
              {uploading ? (
                <RiLoader4Line className="h-4 w-4 animate-spin" />
              ) : (
                <RiAttachment2 className="h-4 w-4" />
              )}
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
