"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  RiDeleteBinLine,
  RiUserLine,
  RiBuilding2Line,
  RiMapPinLine,
  RiFolderLine,
  RiBankLine,
  RiHistoryLine,
  RiCameraLine,
} from "@remixicon/react";
import { FileUploader } from "@/components/ui/file-uploader";
import { useContactDetail } from "@/hooks/use-contact-detail";
import { ContactGeneralTab } from "./contact-general-tab";
import { ContactAddressTab } from "./contact-address-tab";
import { ContactFilesTab } from "./contact-files-tab";
import { ContactBankTab } from "./contact-bank-tab";
import { ContactActivityTab } from "./contact-activity-tab";

interface ContactDrawerProps {
  contactId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactDeleted?: () => void;
  onContactUpdated?: () => void;
  onOpenRelatedContact?: (contactId: number) => void;
  onContactCreated?: (contactId: number) => void;
  mode?: "view" | "create";
}

export function ContactDrawer({
  contactId,
  open,
  onOpenChange,
  onContactDeleted,
  onContactUpdated,
  onOpenRelatedContact,
  onContactCreated,
  mode = "view",
}: ContactDrawerProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [deleting, setDeleting] = useState(false);
  const [showAvatarUploader, setShowAvatarUploader] = useState(false);

  // Create mode state
  const [isCreateMode, setIsCreateMode] = useState(mode === "create");
  const [creating, setCreating] = useState(false);
  const [newContactType, setNewContactType] = useState<"person" | "company">("person");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [internalContactId, setInternalContactId] = useState<number | null>(contactId);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset state when mode changes or drawer opens
  useEffect(() => {
    if (open) {
      if (mode === "create") {
        setIsCreateMode(true);
        setNewFirstName("");
        setNewLastName("");
        setNewCompanyName("");
        setNewContactType("person");
        setInternalContactId(null);
        setTimeout(() => nameInputRef.current?.focus(), 100);
      } else {
        setIsCreateMode(false);
        setInternalContactId(contactId);
      }
    }
  }, [open, mode, contactId]);

  // Use internal contactId for the hook
  const effectiveContactId = isCreateMode ? internalContactId : contactId;

  const {
    contact,
    documents,
    photos,
    activities,
    linkedEvents,
    linkedTasks,
    relationships,
    loading,
    refetch,
    updateContact,
    addDocument,
    deleteDocument,
    addPhoto,
    deletePhoto,
    addActivity,
    addRelationship,
    removeRelationship,
  } = useContactDetail(effectiveContactId);

  useEffect(() => {
    if (open && effectiveContactId && !isCreateMode) {
      refetch();
    }
  }, [open, effectiveContactId, refetch, isCreateMode]);

  // Create contact function
  const handleCreateContact = async () => {
    const name = newContactType === "person"
      ? `${newFirstName} ${newLastName}`.trim()
      : newCompanyName.trim();

    if (!name) return;

    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        type: newContactType,
        name,
      };

      if (newContactType === "person") {
        payload.firstName = newFirstName || undefined;
        payload.lastName = newLastName || undefined;
      }

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.success && result.data) {
        const newId = result.data.id;
        setInternalContactId(newId);
        setIsCreateMode(false);
        onContactCreated?.(newId);
      } else if (result.error?.code === "DUPLICATE_WARNING") {
        const proceed = confirm(
          `Se encontraron posibles duplicados:\n${result.error.duplicates.map((d: { name: string }) => d.name).join(", ")}\n\n¿Deseas crear el contacto de todas formas?`
        );
        if (proceed) {
          const forceRes = await fetch("/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, forceDuplicate: true }),
          });
          const forceResult = await forceRes.json();
          if (forceResult.success && forceResult.data) {
            const newId = forceResult.data.id;
            setInternalContactId(newId);
            setIsCreateMode(false);
            onContactCreated?.(newId);
          }
        }
      } else {
        alert(result.error?.message || "Error al crear contacto");
      }
    } catch (error) {
      console.error("Failed to create contact:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const name = newContactType === "person"
        ? `${newFirstName} ${newLastName}`.trim()
        : newCompanyName.trim();
      if (name) handleCreateContact();
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    const idToDelete = effectiveContactId;
    if (!idToDelete || !confirm("¿Estás seguro de eliminar este contacto?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${idToDelete}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        onOpenChange(false);
        onContactDeleted?.();
      }
    } catch (error) {
      console.error("Failed to delete contact:", error);
    } finally {
      setDeleting(false);
    }
  };

  const handleContactUpdate = async (updates: Record<string, unknown>) => {
    const result = await updateContact(updates);
    if (result) {
      onContactUpdated?.();
    }
    return result;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-6xl md:max-w-7xl p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isCreateMode ? (
                /* Create Mode Header */
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className={newContactType === "company" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}>
                      {newContactType === "company" ? (
                        <RiBuilding2Line className="h-6 w-6" />
                      ) : (
                        <RiUserLine className="h-6 w-6" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <SheetTitle className="text-xl font-semibold">Nuevo Contacto</SheetTitle>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border rounded-md overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setNewContactType("person")}
                          className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                            newContactType === "person" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                          }`}
                        >
                          <RiUserLine className="h-3.5 w-3.5" />
                          Persona
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewContactType("company")}
                          className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                            newContactType === "company" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                          }`}
                        >
                          <RiBuilding2Line className="h-3.5 w-3.5" />
                          Empresa
                        </button>
                      </div>
                      {newContactType === "person" ? (
                        <div className="flex items-center gap-2">
                          <Input
                            ref={nameInputRef}
                            value={newFirstName}
                            onChange={(e) => setNewFirstName(e.target.value)}
                            onKeyDown={handleCreateKeyDown}
                            className="h-9 w-44"
                            placeholder="Nombre *"
                            disabled={creating}
                          />
                          <Input
                            value={newLastName}
                            onChange={(e) => setNewLastName(e.target.value)}
                            onKeyDown={handleCreateKeyDown}
                            className="h-9 w-44"
                            placeholder="Apellido"
                            disabled={creating}
                          />
                        </div>
                      ) : (
                        <Input
                          ref={nameInputRef}
                          value={newCompanyName}
                          onChange={(e) => setNewCompanyName(e.target.value)}
                          onKeyDown={handleCreateKeyDown}
                          className="h-9 w-64"
                          placeholder="Nombre de la empresa *"
                          disabled={creating}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : loading ? (
                <>
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-7 w-48" />
                </>
              ) : (
                <>
                  <div className="relative group">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={contact?.avatar || undefined} />
                      <AvatarFallback className={contact?.type === "company" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}>
                        {contact?.type === "company" ? (
                          <RiBuilding2Line className="h-6 w-6" />
                        ) : (
                          getInitials(contact?.name || "")
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => setShowAvatarUploader(!showAvatarUploader)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <RiCameraLine className="h-5 w-5 text-white" />
                    </button>
                    {showAvatarUploader && (
                      <div className="absolute top-14 left-0 z-50 bg-background border rounded-lg shadow-lg p-3 w-64">
                        <FileUploader
                          folder="contacts/avatars"
                          accept="image/*"
                          maxSize={5 * 1024 * 1024}
                          variant="compact"
                          onUpload={async (result) => {
                            await updateContact({ avatar: result.url });
                            setShowAvatarUploader(false);
                            onContactUpdated?.();
                          }}
                          onError={(error) => alert(error)}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <SheetTitle className="text-xl font-semibold flex items-center gap-2">
                      {contact?.name || "Cargando..."}
                      <Badge variant={contact?.type === "company" ? "secondary" : "outline"}>
                        {contact?.type === "company" ? "Empresa" : "Persona"}
                      </Badge>
                      {contact?.isLead && (
                        <Badge className="bg-green-500">Lead</Badge>
                      )}
                    </SheetTitle>
                    {contact?.email && (
                      <p className="text-sm text-muted-foreground">{contact.email}</p>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mr-8">
              {isCreateMode ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    disabled={creating}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreateContact}
                    disabled={creating || (
                      newContactType === "person" ? !newFirstName.trim() : !newCompanyName.trim()
                    )}
                    className="gap-2"
                  >
                    {creating ? "Creando..." : "Crear Contacto"}
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting || loading}
                  className="text-destructive border-destructive/50 hover:bg-destructive hover:text-destructive-foreground gap-2"
                >
                  <RiDeleteBinLine className="h-4 w-4" />
                  {deleting ? "Eliminando..." : "Eliminar"}
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content with Tabs */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {isCreateMode && !effectiveContactId ? (
              /* Create Mode - Show placeholder */
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <RiUserLine className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nuevo Contacto</h3>
                  <p className="text-muted-foreground mb-4">
                    Escribe el nombre arriba y presiona <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd> o haz clic en &quot;Crear Contacto&quot; para comenzar.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Podrás completar todos los detalles del contacto una vez creado.
                  </p>
                </div>
              </div>
            ) : (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="px-6 pt-4 flex-shrink-0 border-b">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="general" className="gap-2">
                    <RiUserLine className="h-4 w-4" />
                    {contact?.type === "company" ? "Acerca de" : "General"}
                  </TabsTrigger>
                  <TabsTrigger value="address" className="gap-2">
                    <RiMapPinLine className="h-4 w-4" />
                    Dirección
                  </TabsTrigger>
                  <TabsTrigger value="files" className="gap-2">
                    <RiFolderLine className="h-4 w-4" />
                    Archivos
                  </TabsTrigger>
                  <TabsTrigger value="bank" className="gap-2">
                    <RiBankLine className="h-4 w-4" />
                    Banco
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="gap-2">
                    <RiHistoryLine className="h-4 w-4" />
                    Actividad
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="general" className="h-full m-0">
                  <ContactGeneralTab
                    contact={contact}
                    loading={loading}
                    onUpdateContact={handleContactUpdate}
                    linkedEvents={linkedEvents}
                    linkedTasks={linkedTasks}
                    relationships={relationships}
                    onAddRelationship={addRelationship}
                    onRemoveRelationship={removeRelationship}
                    onOpenRelatedContact={onOpenRelatedContact}
                  />
                </TabsContent>

                <TabsContent value="address" className="h-full m-0">
                  <ContactAddressTab
                    contact={contact}
                    loading={loading}
                    onUpdateContact={handleContactUpdate}
                  />
                </TabsContent>

                <TabsContent value="files" className="h-full m-0">
                  <ContactFilesTab
                    photos={photos}
                    documents={documents}
                    loading={loading}
                    onAddPhoto={addPhoto}
                    onDeletePhoto={deletePhoto}
                    onAddDocument={addDocument}
                    onDeleteDocument={deleteDocument}
                  />
                </TabsContent>

                <TabsContent value="bank" className="h-full m-0">
                  <ContactBankTab
                    contact={contact}
                    loading={loading}
                    onUpdateContact={handleContactUpdate}
                  />
                </TabsContent>

                <TabsContent value="activity" className="h-full m-0">
                  <ContactActivityTab
                    activities={activities}
                    loading={loading}
                    onAddActivity={addActivity}
                  />
                </TabsContent>
              </div>
            </Tabs>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
