"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiUserLine,
  RiCalendarLine,
  RiFlag2Line,
  RiYoutubeLine,
  RiAddLine,
  RiDeleteBinLine,
  RiGroupLine,
  RiStore2Line,
  RiContactsLine,
} from "@remixicon/react";
import { TaskYoutubeEmbed } from "./task-youtube-embed";
import { TaskRichEditor } from "./task-rich-editor";
import { ParticipantSelector } from "./participant-selector";
import { TaskChecklistSection } from "./task-checklist-section";

interface TaskDetail {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  dueDate: string | null;
  eventId: number | null;
  assignedTo: string | null;
  assignedUserName?: string | null;
}

interface TaskParticipant {
  id: number;
  userId: string | null;
  vendorId: number | null;
  contactId?: number | null;
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
  vendorName?: string | null;
  contactName?: string | null;
  name?: string | null;
  isVendor?: boolean;
  isContact?: boolean;
  type: string;
  canEdit: boolean;
  canComment: boolean;
}

interface TaskVideo {
  id: number;
  youtubeUrl: string;
  title: string | null;
}

interface TaskHtmlContent {
  taskId: number;
  content: string;
}

interface ChecklistAssignee {
  id: number;
  participantId: number;
  type: string | null;
  name: string;
  isUser: boolean;
  isVendor: boolean;
  isContact: boolean;
  assignedAt: string | null;
}

interface TaskChecklistItem {
  id: number;
  taskId: number;
  title: string;
  isCompleted: boolean;
  dueDate: string | null;
  sortOrder: number;
  completedAt: string | null;
  completedBy: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  assignees: ChecklistAssignee[];
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface Vendor {
  id: number;
  name: string;
  category: string | null;
}

interface TaskGeneralTabProps {
  task: TaskDetail | null;
  participants: TaskParticipant[];
  videos: TaskVideo[];
  htmlContent: TaskHtmlContent | null;
  checklistItems: TaskChecklistItem[];
  loading: boolean;
  onUpdateTask: (updates: Record<string, unknown>) => Promise<unknown>;
  onAddVideo: (data: { youtubeUrl: string; title?: string }) => Promise<unknown>;
  onDeleteVideo: (videoId: number) => Promise<boolean>;
  onSaveHtmlContent: (content: string) => Promise<unknown>;
  onAddParticipant: (data: { userId?: string; vendorId?: number; contactId?: number; type: string }) => Promise<unknown>;
  onRemoveParticipant: (participantId: number) => Promise<boolean>;
  onAddChecklistItem: (data: { title: string; dueDate?: string; assigneeIds?: number[] }) => Promise<unknown>;
  onUpdateChecklistItem: (itemId: number, updates: { title?: string; isCompleted?: boolean; dueDate?: string | null }) => Promise<unknown>;
  onToggleChecklistItem: (itemId: number, isCompleted: boolean) => Promise<unknown>;
  onDeleteChecklistItem: (itemId: number) => Promise<boolean>;
  onAddChecklistAssignee: (itemId: number, participantId: number) => Promise<unknown>;
  onRemoveChecklistAssignee: (itemId: number, participantId: number) => Promise<boolean>;
}

const priorityOptions = [
  { value: "low", label: "Baja", color: "text-green-500" },
  { value: "medium", label: "Media", color: "text-yellow-500" },
  { value: "high", label: "Alta", color: "text-red-500" },
];

const categoryOptions = [
  { value: "general", label: "General", color: "bg-gray-500" },
  { value: "evento", label: "Evento", color: "bg-red-500" },
  { value: "proveedor", label: "Proveedor", color: "bg-blue-500" },
  { value: "cliente", label: "Cliente", color: "bg-green-500" },
  { value: "pago", label: "Pago", color: "bg-yellow-500" },
];

export function TaskGeneralTab({
  task,
  participants,
  videos,
  htmlContent,
  checklistItems,
  loading,
  onUpdateTask,
  onAddVideo,
  onDeleteVideo,
  onSaveHtmlContent,
  onAddParticipant,
  onRemoveParticipant,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onAddChecklistAssignee,
  onRemoveChecklistAssignee,
}: TaskGeneralTabProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [addingVideo, setAddingVideo] = useState(false);
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [contacts, setContacts] = useState<{ id: number; name: string; email: string | null; type: string }[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Fetch team members and vendors for assignment
  useEffect(() => {
    async function fetchData() {
      setLoadingMembers(true);
      try {
        const [teamRes, vendorsRes, contactsRes] = await Promise.all([
          fetch("/api/team"),
          fetch("/api/vendors"),
          fetch("/api/contacts"),
        ]);
        const teamData = await teamRes.json();
        const vendorsData = await vendorsRes.json();
        const contactsData = await contactsRes.json();
        
        if (teamData.success && teamData.data?.members) {
          setTeamMembers(teamData.data.members);
        } else if (teamData.success && Array.isArray(teamData.data)) {
          setTeamMembers(teamData.data);
        } else if (teamData.members) {
          setTeamMembers(teamData.members);
        } else {
          setTeamMembers([]);
        }
        
        if (vendorsData.success && Array.isArray(vendorsData.data)) {
          setVendors(vendorsData.data);
        } else {
          setVendors([]);
        }
        
        if (contactsData.success && Array.isArray(contactsData.data)) {
          setContacts(contactsData.data);
        } else {
          setContacts([]);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setTeamMembers([]);
        setVendors([]);
        setContacts([]);
      } finally {
        setLoadingMembers(false);
      }
    }
    fetchData();
  }, []);

  const handleAddVideo = async () => {
    if (!youtubeUrl.trim()) return;
    setAddingVideo(true);
    try {
      await onAddVideo({ youtubeUrl: youtubeUrl.trim() });
      setYoutubeUrl("");
    } finally {
      setAddingVideo(false);
    }
  };

  const handleAddParticipant = async (userId: string) => {
    // Ignore placeholder values and prevent double-clicks
    if (!userId || userId.startsWith("__") || addingParticipant) return;
    setAddingParticipant(true);
    try {
      await onAddParticipant({ userId, type: "planner" });
    } finally {
      setAddingParticipant(false);
    }
  };

  const handleAddVendorParticipant = async (vendorId: string) => {
    // Ignore placeholder values and prevent double-clicks
    if (!vendorId || vendorId.startsWith("__") || addingParticipant) return;
    const id = parseInt(vendorId, 10);
    if (isNaN(id)) return;
    setAddingParticipant(true);
    try {
      await onAddParticipant({ vendorId: id, type: "vendor" });
    } finally {
      setAddingParticipant(false);
    }
  };

  const handleAddContactParticipant = async (contactId: string) => {
    // Ignore placeholder values and prevent double-clicks
    if (!contactId || contactId.startsWith("__") || addingParticipant) return;
    const id = parseInt(contactId, 10);
    if (isNaN(id)) return;
    setAddingParticipant(true);
    try {
      await onAddParticipant({ contactId: id, type: "contact" });
    } finally {
      setAddingParticipant(false);
    }
  };

  // Filter out already added participants (with defensive checks)
  const safeTeamMembers = teamMembers || [];
  const safeVendors = vendors || [];
  const safeParticipants = participants || [];
  const availableMembers = safeTeamMembers.filter(
    (m) => !safeParticipants.some((p) => p.userId === m.id)
  );
  const availableVendors = safeVendors.filter(
    (v) => !safeParticipants.some((p) => p.vendorId === v.id)
  );
  const safeContacts = contacts || [];
  const availableContacts = safeContacts.filter(
    (c) => !safeParticipants.some((p) => (p as any).contactId === c.id)
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Task Fields Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Asignado a */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <RiUserLine className="h-4 w-4 text-muted-foreground" />
            Asignado a
          </label>
          <Select
            value={task?.assignedTo || "__unassigned__"}
            onValueChange={(value) => onUpdateTask({ assignedTo: value === "__unassigned__" ? null : value })}
            disabled={loadingMembers}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unassigned__">
                <span className="text-muted-foreground">Sin asignar</span>
              </SelectItem>
              {teamMembers.length === 0 && !loadingMembers ? (
                <SelectItem value="__no_members__" disabled>
                  No hay miembros del equipo
                </SelectItem>
              ) : (
                teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={member.image} />
                        <AvatarFallback className="text-xs">
                          {member.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      {member.name || member.email}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Categoría */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Categoría</label>
          <Select
            value={task?.category || "general"}
            onValueChange={(value) => onUpdateTask({ category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                    {cat.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fecha */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <RiCalendarLine className="h-4 w-4 text-muted-foreground" />
            Fecha
          </label>
          <Input
            type="date"
            value={(() => {
              if (!task?.dueDate) return "";
              const d = new Date(task.dueDate);
              return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
            })()}
            onChange={(e) =>
              onUpdateTask({ dueDate: e.target.value ? new Date(e.target.value) : null })
            }
          />
        </div>

        {/* Prioridad */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <RiFlag2Line className="h-4 w-4 text-muted-foreground" />
            Prioridad
          </label>
          <Select
            value={task?.priority || "medium"}
            onValueChange={(value) => onUpdateTask({ priority: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  <span className={p.color}>{p.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Participantes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <RiGroupLine className="h-4 w-4 text-muted-foreground" />
            Participantes {participants.length > 0 && `(${participants.length})`}
          </label>
          <ParticipantSelector
            teamMembers={teamMembers}
            vendors={vendors}
            contacts={contacts}
            excludedMemberIds={safeParticipants.filter(p => p.userId).map(p => p.userId!)}
            excludedVendorIds={safeParticipants.filter(p => p.vendorId).map(p => p.vendorId!)}
            excludedContactIds={safeParticipants.filter(p => (p as any).contactId).map(p => (p as any).contactId)}
            onAddMember={handleAddParticipant}
            onAddVendor={(id) => handleAddVendorParticipant(id.toString())}
            onAddContact={(id) => handleAddContactParticipant(id.toString())}
            disabled={addingParticipant || loadingMembers}
          />
        </div>
        
        {/* Participant List - Vertical Layout */}
        {participants.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
            No hay participantes asignados
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {participants.map((p) => {
              const isContact = p.isContact || p.type === "contact" || !!(p as any).contactId;
              const isVendor = p.isVendor || p.type === "vendor" || !!p.vendorId;
              const displayName = p.contactName || p.name || p.userName || p.userEmail || p.vendorName;
              const typeLabel = isContact ? "Contacto" : isVendor ? "Proveedor" : "Miembro";
              
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  {/* Icon/Avatar */}
                  {isContact ? (
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <RiContactsLine className="h-4 w-4 text-green-600" />
                    </div>
                  ) : isVendor ? (
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <RiStore2Line className="h-4 w-4 text-blue-600" />
                    </div>
                  ) : (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={p.userImage || undefined} />
                      <AvatarFallback className="text-xs bg-gray-100">
                        {displayName?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  {/* Name and Type */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{typeLabel}</p>
                  </div>
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => onRemoveParticipant(p.id)}
                    className="p-1 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                    title="Eliminar participante"
                  >
                    <RiDeleteBinLine className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* YouTube Videos */}
      <div className="space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <RiYoutubeLine className="h-4 w-4 text-red-500" />
          Link de Youtube
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
          />
          <Button
            size="sm"
            onClick={handleAddVideo}
            disabled={addingVideo || !youtubeUrl.trim()}
          >
            {addingVideo ? "..." : "Añadir"}
          </Button>
        </div>
        {videos.length > 0 && (
          <div className="space-y-3">
            {videos.map((video) => (
              <div key={video.id} className="relative group">
                <TaskYoutubeEmbed url={video.youtubeUrl} />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={() => onDeleteVideo(video.id)}
                >
                  <RiDeleteBinLine className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rich Text Editor */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Descripción</label>
        <TaskRichEditor
          content={htmlContent?.content || ""}
          onSave={onSaveHtmlContent}
        />
      </div>

      {/* Checklist / To-Do List */}
      <div className="border-t pt-6">
        <TaskChecklistSection
          checklistItems={checklistItems}
          participants={participants}
          loading={loading}
          onAddItem={onAddChecklistItem}
          onUpdateItem={onUpdateChecklistItem}
          onToggleItem={onToggleChecklistItem}
          onDeleteItem={onDeleteChecklistItem}
          onAddAssignee={onAddChecklistAssignee}
          onRemoveAssignee={onRemoveChecklistAssignee}
        />
      </div>
    </div>
  );
}
