"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RiUserAddLine, RiTeamLine, RiContactsLine, RiStore2Line } from "@remixicon/react";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
}

interface ContactItem {
  id: number;
  name: string;
  email: string | null;
  type: string;
}

interface VendorItem {
  id: number;
  name: string;
  category: string | null;
}

type SourceTab = "members" | "contacts" | "vendors";

interface ExistingParticipant {
  userId: string | null;
  contactId: number | null;
  vendorId: number | null;
}

interface CollaboratorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: number;
  onSuccess: () => void;
  existingParticipants?: ExistingParticipant[];
  editingParticipant?: {
    id: number;
    userId: string | null;
    contactId: number | null;
    vendorId: number | null;
    userName: string | null;
    userEmail: string | null;
    contactName: string | null;
    vendorName: string | null;
    type: string;
    role: string | null;
    permissions: Record<string, string> | null;
  } | null;
}

const SECTIONS = [
  { key: "general", label: "General", levels: ["none", "view", "edit"] },
  { key: "tasks", label: "Tareas", levels: ["none", "view", "edit"] },
  { key: "guests", label: "Lista de Invitados", levels: ["none", "view", "edit"] },
  { key: "rsvp", label: "RSVP", levels: ["none", "view", "edit"] },
  { key: "vendors", label: "Proveedores", levels: ["none", "view"] },
  { key: "finances", label: "Finanzas", levels: ["none", "view"] },
] as const;

const LEVEL_LABELS: Record<string, string> = {
  none: "Sin acceso",
  view: "Ver",
  edit: "Editar",
};

const PRESETS = [
  { label: "Acceso completo", value: { general: "edit", tasks: "edit", guests: "edit", rsvp: "edit", vendors: "view", finances: "view", settings: "none" } },
  { label: "Solo lectura", value: { general: "view", tasks: "view", guests: "view", rsvp: "view", vendors: "view", finances: "view", settings: "none" } },
  { label: "Solo RSVP e Invitados", value: { general: "view", tasks: "none", guests: "view", rsvp: "view", vendors: "none", finances: "none", settings: "none" } },
  { label: "Solo información", value: { general: "none", tasks: "none", guests: "none", rsvp: "none", vendors: "none", finances: "none", settings: "none" } },
];

const DEFAULT_PERMISSIONS: Record<string, string> = {
  general: "view",
  tasks: "view",
  guests: "view",
  rsvp: "view",
  vendors: "none",
  finances: "view",
  settings: "none",
};

const ROLE_OPTIONS = [
  { label: "Cliente", value: "client" },
  { label: "Organizador", value: "organizer" },
  { label: "Asistente", value: "assistant" },
  { label: "Patrocinador", value: "sponsor" },
  { label: "Ponente", value: "speaker" },
  { label: "Proveedor", value: "vendor" },
  { label: "Otro", value: "other" },
];

function getDisplayName(p: CollaboratorDrawerProps["editingParticipant"]) {
  if (!p) return "";
  return p.userName || p.userEmail || p.contactName || p.vendorName || "Sin nombre";
}

export function CollaboratorDrawer({
  open,
  onOpenChange,
  eventId,
  onSuccess,
  existingParticipants = [],
  editingParticipant,
}: CollaboratorDrawerProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [contactsList, setContactsList] = useState<ContactItem[]>([]);
  const [vendorsList, setVendorsList] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<SourceTab>("members");
  const [search, setSearch] = useState("");

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);

  const [role, setRole] = useState<string>("");
  const [roleError, setRoleError] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);
  const [permissions, setPermissions] = useState<Record<string, string>>(DEFAULT_PERMISSIONS);
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingParticipant;

  const hasSelection = selectedUserId || selectedContactId || selectedVendorId;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [teamRes, contactsRes, vendorsRes] = await Promise.all([
        fetch("/api/team"),
        fetch("/api/contacts?limit=200"),
        fetch("/api/vendors"),
      ]);
      const [teamData, contactsData, vendorsData] = await Promise.all([
        teamRes.json(),
        contactsRes.json(),
        vendorsRes.json(),
      ]);
      if (teamData.success) setMembers(teamData.data?.members || []);
      if (contactsData.success) setContactsList(contactsData.data || []);
      if (vendorsData.success) setVendorsList(vendorsData.data || []);
    } catch {
      console.error("Error fetching collaborator sources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !isEditing) {
      fetchData();
    }
  }, [open, isEditing, fetchData]);

  useEffect(() => {
    if (editingParticipant) {
      setPermissions(editingParticipant.permissions || DEFAULT_PERMISSIONS);
      setRole(editingParticipant.role || "");
    } else {
      setSelectedUserId("");
      setSelectedContactId(null);
      setSelectedVendorId(null);
      setRole("");
      setRoleError(false);
      setSearch("");
      setPermissions(DEFAULT_PERMISSIONS);
      setActiveTab("members");
    }
  }, [editingParticipant, open]);

  function clearSelection() {
    setSelectedUserId("");
    setSelectedContactId(null);
    setSelectedVendorId(null);
  }

  function selectMember(id: string) {
    clearSelection();
    setSelectedUserId(id);
  }

  function selectContact(id: number) {
    clearSelection();
    setSelectedContactId(id);
  }

  function selectVendor(id: number) {
    clearSelection();
    setSelectedVendorId(id);
    setRole("vendor");
  }

  function setSectionLevel(section: string, level: string) {
    setPermissions((prev) => ({ ...prev, [section]: level }));
  }

  function applyPreset(preset: Record<string, string>) {
    setPermissions(preset);
  }

  function getParticipantType(): string {
    if (selectedUserId) return "planner";
    if (selectedContactId) return "contact";
    if (selectedVendorId) return "vendor";
    return "planner";
  }

  async function handleSave() {
    if (!isEditing && !hasSelection) {
      toast.error("Selecciona un miembro, contacto o proveedor");
      return;
    }

    if (!role) {
      setRoleError(true);
      toast.error("Seleccioná un rol para el colaborador");
      roleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSaving(true);
    try {
      if (isEditing && editingParticipant) {
        const res = await fetch(`/api/events/${eventId}/collaborators/${editingParticipant.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions, role }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Colaborador actualizado");
          onOpenChange(false);
          onSuccess();
        } else {
          toast.error(data.error?.message || "Error al actualizar");
        }
      } else {
        const body: Record<string, unknown> = {
          type: getParticipantType(),
          role,
          permissions,
        };
        if (selectedUserId) body.userId = selectedUserId;
        if (selectedContactId) body.contactId = selectedContactId;
        if (selectedVendorId) body.vendorId = selectedVendorId;

        const res = await fetch(`/api/events/${eventId}/collaborators`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Colaborador agregado");
          onOpenChange(false);
          onSuccess();
        } else {
          toast.error(data.error?.message || "Error al agregar");
        }
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  const assignedUserIds = new Set(existingParticipants.filter(p => p.userId).map(p => p.userId!));
  const assignedContactIds = new Set(existingParticipants.filter(p => p.contactId).map(p => p.contactId!));
  const assignedVendorIds = new Set(existingParticipants.filter(p => p.vendorId).map(p => p.vendorId!));

  const filteredMembers = members.filter(
    (m) =>
      !assignedUserIds.has(m.id) &&
      ((m.name || "").toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredContacts = contactsList.filter(
    (c) =>
      !assignedContactIds.has(c.id) &&
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase()))
  );

  const filteredVendors = vendorsList.filter(
    (v) =>
      !assignedVendorIds.has(v.id) &&
      (v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.category || "").toLowerCase().includes(search.toLowerCase()))
  );

  const TABS: { key: SourceTab; label: string; icon: typeof RiTeamLine; count: number }[] = [
    { key: "members", label: "Miembros", icon: RiTeamLine, count: filteredMembers.length },
    { key: "contacts", label: "Contactos", icon: RiContactsLine, count: filteredContacts.length },
    { key: "vendors", label: "Proveedores", icon: RiStore2Line, count: filteredVendors.length },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <RiUserAddLine className="h-5 w-5" />
            {isEditing ? "Editar colaborador" : "Agregar colaborador"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? `Editando: ${getDisplayName(editingParticipant)}`
              : "Selecciona un miembro, contacto o proveedor y configura sus permisos"}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 py-4 space-y-6">
          {/* Unified selector (only for new) */}
          {!isEditing && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Seleccionar colaborador</label>

              <div className="flex rounded-lg border divide-x">
                {TABS.map(({ key, label, icon: Icon, count }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                      activeTab === key
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    <span className="text-[10px] opacity-70">({count})</span>
                  </button>
                ))}
              </div>

              <Input
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
              />

              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                  {activeTab === "members" && filteredMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => selectMember(m.id)}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                        selectedUserId === m.id ? "bg-primary/10" : "hover:bg-muted"
                      }`}
                    >
                      <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700 shrink-0">
                        {(m.name || m.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{m.name || m.email}</p>
                        {m.name && <p className="text-xs text-muted-foreground truncate">{m.email}</p>}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{m.role}</Badge>
                    </button>
                  ))}

                  {activeTab === "contacts" && filteredContacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectContact(c.id)}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                        selectedContactId === c.id ? "bg-primary/10" : "hover:bg-muted"
                      }`}
                    >
                      <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-medium text-green-700 shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{c.type === "company" ? "Empresa" : "Persona"}</Badge>
                    </button>
                  ))}

                  {activeTab === "vendors" && filteredVendors.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => selectVendor(v.id)}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                        selectedVendorId === v.id ? "bg-primary/10" : "hover:bg-muted"
                      }`}
                    >
                      <div className="h-7 w-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-medium text-orange-700 shrink-0">
                        {v.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{v.name}</p>
                        {v.category && <p className="text-xs text-muted-foreground truncate">{v.category}</p>}
                      </div>
                    </button>
                  ))}

                  {((activeTab === "members" && filteredMembers.length === 0) ||
                    (activeTab === "contacts" && filteredContacts.length === 0) ||
                    (activeTab === "vendors" && filteredVendors.length === 0)) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No se encontraron resultados
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Invitation indicator for contacts */}
          {!isEditing && selectedContactId && (() => {
            const selected = contactsList.find(c => c.id === selectedContactId);
            if (!selected) return null;
            if (selected.email) {
              return (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <span className="shrink-0">📧</span>
                  <span>Se enviará invitación a <strong>{selected.email}</strong> para acceder al evento</span>
                </div>
              );
            }
            return (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                <span className="shrink-0">⚠️</span>
                <span>Este contacto no tiene email — no podrá acceder a la plataforma</span>
              </div>
            );
          })()}

          {/* Role in event */}
          <div ref={roleRef} className="space-y-2">
            <label className="text-sm font-medium">Rol en el evento <span className="text-destructive">*</span></label>
            <Select value={role} onValueChange={(v) => { setRole(v); setRoleError(false); }}>
              <SelectTrigger aria-invalid={roleError || undefined}>
                <SelectValue placeholder="Seleccionar rol..." />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {roleError && <p className="text-xs text-destructive">Seleccioná un rol para continuar</p>}
            <p className="text-xs text-muted-foreground">Etiqueta descriptiva. Los permisos reales se configuran abajo.</p>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Presets rápidos</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Permission matrix */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Permisos por sección</label>
            <div className="border rounded-lg divide-y">
              {SECTIONS.map(({ key, label, levels }) => (
                <div key={key} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {LEVEL_LABELS[permissions[key] || "none"]}
                    </p>
                  </div>
                  <Select
                    value={permissions[key] || "none"}
                    onValueChange={(val) => setSectionLevel(key, val)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {LEVEL_LABELS[level]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Resumen de acceso</label>
            <div className="flex flex-wrap gap-1.5">
              {SECTIONS.filter(({ key }) => permissions[key] !== "none").map(({ key, label }) => (
                <Badge key={key} variant={permissions[key] === "edit" ? "default" : "secondary"}>
                  {label} ({permissions[key] === "edit" ? "editar" : "ver"})
                </Badge>
              ))}
              {SECTIONS.every(({ key }) => permissions[key] === "none") && (
                <p className="text-sm text-muted-foreground">Solo información (sin acceso a secciones)</p>
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="px-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || (!isEditing && !hasSelection)}>
            {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Agregar colaborador"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export { DEFAULT_PERMISSIONS };
