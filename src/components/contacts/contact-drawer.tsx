"use client";

import { useState, useEffect } from "react";
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
}

export function ContactDrawer({
  contactId,
  open,
  onOpenChange,
  onContactDeleted,
  onContactUpdated,
  onOpenRelatedContact,
}: ContactDrawerProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [deleting, setDeleting] = useState(false);
  const [showAvatarUploader, setShowAvatarUploader] = useState(false);

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
  } = useContactDetail(contactId);

  useEffect(() => {
    if (open && contactId) {
      refetch();
    }
  }, [open, contactId, refetch]);

  const handleDelete = async () => {
    if (!contactId || !confirm("¿Estás seguro de eliminar este contacto?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { method: "DELETE" });
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
        className="w-full sm:max-w-4xl md:max-w-5xl p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {loading ? (
                <Skeleton className="h-12 w-12 rounded-full" />
              ) : (
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
              )}
              <div>
                {loading ? (
                  <Skeleton className="h-7 w-48" />
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 mr-8">
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
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content with Tabs */}
          <div className="flex-1 flex flex-col overflow-hidden">
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
