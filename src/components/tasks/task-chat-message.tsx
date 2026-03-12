"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RiLockLine,
  RiDeleteBinLine,
  RiFileTextLine,
  RiDownloadLine,
  RiImageLine,
  RiFilePdfLine,
  RiFileWordLine,
  RiFileExcelLine,
} from "@remixicon/react";

interface TaskMessageAttachment {
  id: number;
  name: string;
  url: string;
  type: string;
  size: number | null;
  mimeType: string | null;
}

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
}

interface TaskChatMessageProps {
  message: TaskMessage;
  isOwnMessage?: boolean;
  onDelete?: (messageId: number) => void;
}

function formatMessageDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (diffDays === 1) {
    return "Ayer";
  } else if (diffDays < 7) {
    return date.toLocaleDateString("es-ES", { weekday: "short" });
  } else {
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  }
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <RiFileTextLine className="h-5 w-5 text-primary" />;
  if (mimeType.startsWith("image/")) return <RiImageLine className="h-5 w-5 text-blue-500" />;
  if (mimeType === "application/pdf") return <RiFilePdfLine className="h-5 w-5 text-red-500" />;
  if (mimeType.includes("word") || mimeType.includes("document")) return <RiFileWordLine className="h-5 w-5 text-blue-600" />;
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return <RiFileExcelLine className="h-5 w-5 text-green-600" />;
  return <RiFileTextLine className="h-5 w-5 text-primary" />;
}

export function TaskChatMessage({ message, isOwnMessage = false, onDelete }: TaskChatMessageProps) {
  const initials = message.senderName
    ? message.senderName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className={`group flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}>
      <Avatar className={`h-8 w-8 shrink-0 ${isOwnMessage ? "ring-2 ring-primary/20" : ""}`}>
        <AvatarImage src={message.senderImage} />
        <AvatarFallback className={`text-xs ${isOwnMessage ? "bg-primary/20 text-primary" : ""}`}>{initials}</AvatarFallback>
      </Avatar>

      <div className={`flex-1 min-w-0 ${isOwnMessage ? "text-right" : ""}`}>
        {/* Header */}
        <div className={`flex items-center gap-2 flex-wrap ${isOwnMessage ? "justify-end" : ""}`}>
          <span className="font-medium text-sm">
            {isOwnMessage ? "Tú" : (message.senderName || message.senderEmail || "Usuario")}
          </span>
          
          {message.isPrivate && (
            <Badge variant="outline" className="text-xs gap-1 py-0 h-5">
              <RiLockLine className="h-3 w-3" />
              Comentario privado
            </Badge>
          )}
          
          <span className="text-xs text-muted-foreground">
            {formatMessageDate(message.createdAt)}
          </span>
          
          {message.isEdited && (
            <span className="text-xs text-muted-foreground">(editado)</span>
          )}
        </div>

        {/* Content */}
        <div className={`mt-1 ${isOwnMessage ? "flex flex-col items-end" : ""}`}>
          {message.type === "text" && (
            <div className={`inline-block rounded-xl px-3 py-2 max-w-[85%] ${
              isOwnMessage 
                ? "bg-primary/10 text-foreground rounded-tr-sm" 
                : "bg-muted/60 text-foreground rounded-tl-sm"
            }`}>
              <p className="text-sm whitespace-pre-wrap break-words text-left">
                {message.content}
              </p>
            </div>
          )}

          {message.type === "file" && message.attachments && message.attachments.length > 0 && (
            <div className="space-y-2 mt-2">
              {message.attachments.map((attachment) => {
                const isImage = attachment.mimeType?.startsWith("image/");
                
                if (isImage) {
                  return (
                    <div key={attachment.id} className="space-y-2">
                      <a 
                        href={attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img 
                          src={attachment.url} 
                          alt={attachment.name}
                          className="max-w-xs max-h-48 rounded-lg border border-border object-cover hover:opacity-90 transition-opacity"
                          loading="lazy"
                        />
                      </a>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <RiImageLine className="h-3 w-3" />
                        <span className="truncate">{attachment.name}</span>
                        {attachment.size && <span>({formatFileSize(attachment.size)})</span>}
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/50"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {getFileIcon(attachment.mimeType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attachment.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      asChild
                    >
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                      >
                        <RiDownloadLine className="h-4 w-4 mr-1" />
                        Descargar
                      </a>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Fallback for file messages without attachments yet (loading state) */}
          {message.type === "file" && (!message.attachments || message.attachments.length === 0) && (
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
              <RiFileTextLine className="h-4 w-4" />
              <span className="truncate">{message.content}</span>
            </div>
          )}
        </div>

        {/* Actions (visible on hover) */}
        {onDelete && (
          <div className={`mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwnMessage ? "text-right" : ""}`}>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(message.id)}
            >
              <RiDeleteBinLine className="h-3 w-3 mr-1" />
              Eliminar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
