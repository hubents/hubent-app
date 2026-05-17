"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  RiSendPlaneLine,
  RiAttachment2,
  RiLockLine,
  RiAtLine,
  RiLoader4Line,
  RiImageLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiMailLine,
  RiWhatsappLine,
  RiChat1Line,
} from "@remixicon/react";
import { TaskEmailComposer } from "./task-email-composer";
import { TaskWhatsAppComposer } from "./task-whatsapp-composer";
import { toast } from "sonner";
import { useTaskMessages } from "@/hooks/use-task-messages";
import { useTypingIndicator, usePresenceChannel } from "@/hooks/use-pusher";
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

export function TaskChat({ taskId }: TaskChatProps) {
  const { data: session } = useSession();
  const { messages, loading, sending, sendMessage, deleteMessage, refetch, canComment } = useTaskMessages(taskId);
  const [newMessage, setNewMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [chatMode, setChatMode] = useState<"comment" | "email" | "whatsapp">("comment");
  const [emailReply, setEmailReply] = useState<{ to: string; subject: string } | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<{ gmail: boolean; whatsapp: boolean }>({ gmail: false, whatsapp: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Real-time features
  const channelName = taskId ? `private-task-${taskId}` : null;
  const presenceChannelName = taskId ? `presence-task-${taskId}` : null;
  const { typingUsers, setTyping } = useTypingIndicator(channelName);
  usePresenceChannel(presenceChannelName);

  // Fetch integration status
  useEffect(() => {
    async function fetchIntegrationStatus() {
      try {
        const res = await fetch("/api/integrations/status");
        const data = await res.json();
        if (data.success) {
          const gmail = data.data.toolkits.find((t: { slug: string }) => t.slug === "gmail");
          const whatsapp = data.data.toolkits.find((t: { slug: string }) => t.slug === "whatsapp");
          setIntegrationStatus({
            gmail: gmail?.isConnected || false,
            whatsapp: whatsapp?.isConnected || false,
          });
        }
      } catch {
        // Integration status not critical
      }
    }
    fetchIntegrationStatus();
  }, []);

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

  const processFileUpload = async (file: File) => {
    if (!file || !taskId) return;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("El archivo excede el límite de 10MB", {
        description: "Para archivos más grandes, usa un enlace externo.",
      });
      return;
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
      "application/pdf",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
    ];
    if (!allowedTypes.some(type => file.type === type || file.type.startsWith("image/"))) {
      toast.error("Tipo de archivo no permitido", {
        description: "Formatos permitidos: imágenes, PDF, Word, Excel, texto.",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // 1. Get presigned URL (also pre-validates that user can comment on this task)
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
          folder: "task-attachments",
          taskId,
        }),
      });

      const presignData = await presignRes.json();

      if (!presignData.success) {
        throw new Error(presignData.error?.message || "Error al obtener URL de subida");
      }

      setUploadProgress(30);

      // 2. Upload directly to R2 using presigned URL
      const uploadRes = await fetch(presignData.data.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Error al subir archivo a R2");
      }

      setUploadProgress(60);

      // 3. Save attachment FIRST (without messageId). The attachment is created up-front
      //    so that other realtime subscribers never see a "file" message without payload.
      const isImage = file.type.startsWith("image/");
      const attachmentRes = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          url: presignData.data.publicUrl,
          type: isImage ? "image" : "file",
          size: file.size,
          mimeType: file.type,
        }),
      });

      const attachmentData = await attachmentRes.json();
      if (!attachmentRes.ok || !attachmentData.success) {
        throw new Error(attachmentData?.error?.message || "Error al registrar archivo");
      }

      setUploadProgress(80);

      // 4. Send the message and link the existing attachment in the same transaction.
      //    Pusher fires AFTER the link is persisted, so receivers always get a complete payload.
      await sendMessage({
        content: file.name,
        type: "file",
        isPrivate,
        attachmentId: attachmentData.data.id,
      });

      setUploadProgress(100);

      // 5. Refetch to ensure local state is in sync (Pusher will already have updated others)
      await refetch();

      toast.success("Archivo subido correctamente", {
        description: file.name,
        icon: isImage ? <RiImageLine className="h-4 w-4" /> : <RiCheckLine className="h-4 w-4" />,
      });

    } catch (error) {
      console.error("Failed to upload file:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al subir archivo", {
        description: errorMessage,
        icon: <RiErrorWarningLine className="h-4 w-4" />,
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFileUpload(file);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFileUpload(e.dataTransfer.files[0]);
    }
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
    
    // Trigger typing indicator
    if (value.length > 0) {
      setTyping(true);
    } else {
      setTyping(false);
    }
    
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
    <div className="flex flex-col h-full">
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
                isOwnMessage={message.senderId === session?.user?.id}
                onDelete={message.senderId === session?.user?.id ? deleteMessage : undefined}
                onEmailReply={(replyTo, replySubject) => {
                  // Smart reply: if replyTo is our own connected email or empty,
                  // find the original recipient from the first email_sent in this task
                  let finalReplyTo = replyTo;
                  if (!finalReplyTo || message.type === "email_received") {
                    const firstSent = messages.find(
                      (m) => m.type === "email_sent" && m.emailTo && m.emailTo.length > 0
                    );
                    if (firstSent?.emailTo?.[0]) {
                      finalReplyTo = firstSent.emailTo[0];
                    }
                  }
                  setEmailReply({ to: finalReplyTo, subject: replySubject });
                  setChatMode("email");
                }}
              />
            ))}
            {/* Typing indicator - Enhanced */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5 w-fit animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex -space-x-1">
                  {typingUsers.slice(0, 2).map((user) => (
                    <Avatar key={user.userId} className="h-5 w-5 border-2 border-background ring-2 ring-primary/20">
                      <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                        {user.userName?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="font-medium">
                  {typingUsers.length === 1 
                    ? `${typingUsers[0].userName} está escribiendo`
                    : `${typingUsers.length} personas escribiendo`}
                </span>
                <span className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.6s' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.6s' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.6s' }} />
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area with Drag & Drop */}
      {!canComment ? (
        <div className="p-4 border-t border-border shrink-0 text-center text-sm text-muted-foreground">
          <RiLockLine className="h-4 w-4 inline-block mr-1" />
          No tienes permisos para comentar en esta tarea
        </div>
      ) : (
      <div 
        ref={dropZoneRef}
        className={`p-4 border-t border-border shrink-0 space-y-3 relative transition-colors ${
          dragActive ? "bg-primary/5 border-primary" : ""
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {dragActive && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-40 pointer-events-none">
            <div className="text-center">
              <RiAttachment2 className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium text-primary">Suelta el archivo aquí</p>
            </div>
          </div>
        )}

        {/* Upload progress bar */}
        {uploading && uploadProgress > 0 && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-muted overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
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
        
        {/* Mode selector */}
        <div className="flex items-center gap-1 mb-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={chatMode === "comment" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setChatMode("comment")}
                >
                  <RiChat1Line className="w-3.5 h-3.5" />
                  Comentario
                </Button>
              </TooltipTrigger>
              <TooltipContent>Comentario interno</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={chatMode === "email" ? "default" : "ghost"}
                  size="sm"
                  className={`h-7 text-xs gap-1 ${!integrationStatus.gmail ? "opacity-50" : ""}`}
                  onClick={() => integrationStatus.gmail ? setChatMode("email") : toast.info("Conectá Gmail en Configuración > Integraciones")}
                >
                  <RiMailLine className="w-3.5 h-3.5" />
                  Email
                  {!integrationStatus.gmail && <span className="text-[8px]">(no conectado)</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {integrationStatus.gmail ? "Enviar email desde Gmail" : "Gmail no conectado. Configuralo en Integraciones."}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={chatMode === "whatsapp" ? "default" : "ghost"}
                  size="sm"
                  className={`h-7 text-xs gap-1 ${!integrationStatus.whatsapp ? "opacity-50" : ""}`}
                  onClick={() => integrationStatus.whatsapp ? setChatMode("whatsapp") : toast.info("Conectá WhatsApp en Configuración > Integraciones")}
                >
                  <RiWhatsappLine className="w-3.5 h-3.5" />
                  WhatsApp
                  {!integrationStatus.whatsapp && <span className="text-[8px]">(no conectado)</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {integrationStatus.whatsapp ? "Enviar mensaje vía WhatsApp Business" : "WhatsApp no conectado. Configuralo en Integraciones."}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Email/WhatsApp composers */}
        {chatMode === "email" && taskId && (
          <TaskEmailComposer
            taskId={taskId}
            onClose={() => { setChatMode("comment"); setEmailReply(null); }}
            onSent={() => { refetch(); setEmailReply(null); }}
            initialTo={emailReply?.to}
            initialSubject={emailReply?.subject}
          />
        )}
        {chatMode === "whatsapp" && taskId && (
          <TaskWhatsAppComposer
            taskId={taskId}
            onClose={() => setChatMode("comment")}
            onSent={refetch}
          />
        )}

        {/* Regular comment input */}
        {chatMode === "comment" && (
        <Textarea
          ref={textareaRef}
          value={newMessage}
          onChange={(e) => handleMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Añade un comentario... Usa @ para mencionar"
          className="min-h-20 resize-none"
          disabled={sending}
        />
        )}
        
        {chatMode === "comment" && (
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
              className="h-8 w-8 relative"
              disabled={sending || uploading}
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar archivo (o arrastra y suelta)"
            >
              {uploading ? (
                <>
                  <RiLoader4Line className="h-4 w-4 animate-spin" />
                  {uploadProgress > 0 && (
                    <span className="absolute -top-1 -right-1 text-[10px] font-medium bg-primary text-primary-foreground rounded-full h-4 w-4 flex items-center justify-center">
                      {Math.round(uploadProgress / 10)}
                    </span>
                  )}
                </>
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
        )}
      </div>
      )}
    </div>
  );
}
