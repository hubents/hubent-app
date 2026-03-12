"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RiArrowLeftLine,
  RiSaveLine,
  RiPaletteLine,
  RiSettings4Line,
  RiEyeLine,
  RiPlayLine,
  RiPauseLine,
  RiDraftLine,
  RiCheckLine,
  RiLoader4Line,
  RiLayoutLine,
  RiFileList2Line,
  RiSparklingLine,
  RiLinkM,
  RiGlobeLine,
  RiTaskLine,
  RiFileCopyLine,
  RiDeleteBinLine,
  RiAddLine,
  RiCalendarEventLine,
  RiImageAddLine,
  RiCloseLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { useUserSession } from "@/hooks/use-user-session";
import { FormBuilder, type BuilderField } from "@/components/forms/form-builder";
import { useFileUpload } from "@/hooks/use-file-upload";

interface FormData {
  id: number;
  name: string;
  description: string | null;
  status: string;
  logoUrl: string | null;
  coverImage: string | null;
  primaryColor: string;
  submitButtonText: string;
  thankYouTitle: string;
  thankYouMessage: string;
  redirectUrl: string | null;
  defaultEventType: string | null;
  notifyOnResponse: boolean;
  notifyEmail: string | null;
  gdprEnabled: boolean;
  gdprText: string;
  gdprLink: string | null;
  fields: FieldData[];
  instances: InstanceData[];
}

interface FieldData {
  id: number;
  formId: number;
  type: string;
  label: string;
  placeholder: string | null;
  required: boolean;
  crmMapping: string | null;
  options: unknown;
  sortOrder: number;
  config: unknown;
}

interface InstanceData {
  id: number;
  type: string;
  slug: string | null;
  taskId: number | null;
  status: string;
}

export default function FormEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { can } = useUserSession();
  const canEdit = can("forms:update");
  const formId = Number(params.id);

  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("design");

  // Editable fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#111827");
  const [submitButtonText, setSubmitButtonText] = useState("Enviar");
  const [thankYouTitle, setThankYouTitle] = useState("");
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [notifyOnResponse, setNotifyOnResponse] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [gdprEnabled, setGdprEnabled] = useState(false);
  const [gdprText, setGdprText] = useState("");
  const [gdprLink, setGdprLink] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const { upload: uploadCover, uploading: uploadingCover } = useFileUpload({
    folder: `forms/${formId}/cover`,
    allowedTypes: ["image/*"],
    onSuccess: (result) => {
      setCoverImage(result.url);
      toast.success("Cover subido");
    },
  });

  const { upload: uploadLogo, uploading: uploadingLogo } = useFileUpload({
    folder: `forms/${formId}/logo`,
    allowedTypes: ["image/*"],
    onSuccess: (result) => {
      setLogoUrl(result.url);
      toast.success("Logo subido");
    },
  });

  const fetchForm = useCallback(async () => {
    try {
      const res = await fetch(`/api/forms/${formId}`);
      const data = await res.json();
      if (data.success) {
        const f = data.data;
        setForm(f);
        setName(f.name);
        setDescription(f.description || "");
        setPrimaryColor(f.primaryColor || "#111827");
        setSubmitButtonText(f.submitButtonText || "Enviar");
        setThankYouTitle(f.thankYouTitle || "");
        setThankYouMessage(f.thankYouMessage || "");
        setRedirectUrl(f.redirectUrl || "");
        setNotifyOnResponse(f.notifyOnResponse ?? true);
        setNotifyEmail(f.notifyEmail || "");
        setGdprEnabled(f.gdprEnabled ?? false);
        setGdprText(f.gdprText || "");
        setGdprLink(f.gdprLink || "");
        setCoverImage(f.coverImage || null);
        setLogoUrl(f.logoUrl || null);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => { fetchForm(); }, [fetchForm]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/forms/${formId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          logoUrl: logoUrl || null,
          coverImage: coverImage || null,
          primaryColor,
          submitButtonText,
          thankYouTitle,
          thankYouMessage,
          redirectUrl: redirectUrl || null,
          notifyOnResponse,
          notifyEmail: notifyEmail || null,
          gdprEnabled,
          gdprText,
          gdprLink: gdprLink || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setForm((prev) => prev ? { ...prev, ...data.data } : prev);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/forms/${formId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setForm((prev) => prev ? { ...prev, status: newStatus } : prev);
      }
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RiLoader4Line className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Formulario no encontrado</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/dashboard/forms")}>
          <RiArrowLeftLine className="h-4 w-4 mr-2" /> Volver
        </Button>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
    active: { label: "Activo", color: "bg-emerald-100 text-emerald-700" },
    paused: { label: "Pausado", color: "bg-amber-100 text-amber-700" },
  };
  const st = statusConfig[form.status] || statusConfig.draft;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/forms")}>
            <RiArrowLeftLine className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0"
                placeholder="Nombre del formulario"
                disabled={!canEdit}
              />
              <Badge className={st.color}>{st.label}</Badge>
              {(() => {
                const landingSlug = form.instances?.find((i) => i.type === "landing" && i.slug)?.slug;
                if (!landingSlug) return null;
                return (
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/f/${landingSlug}`;
                      navigator.clipboard.writeText(url);
                      toast.success("Link copiado");
                    }}
                    className="flex items-center gap-1 text-xs text-primary hover:underline ml-1"
                    title={`${window.location.origin}/f/${landingSlug}`}
                  >
                    <RiGlobeLine className="h-3.5 w-3.5" />
                    Copiar link
                  </button>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && form.status === "draft" && (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange("active")}>
              <RiPlayLine className="h-4 w-4 mr-1" /> Activar
            </Button>
          )}
          {canEdit && form.status === "active" && (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange("paused")}>
              <RiPauseLine className="h-4 w-4 mr-1" /> Pausar
            </Button>
          )}
          {canEdit && form.status === "paused" && (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange("active")}>
              <RiPlayLine className="h-4 w-4 mr-1" /> Reactivar
            </Button>
          )}

          {canEdit && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <RiLoader4Line className="h-4 w-4 mr-1 animate-spin" />
              ) : saved ? (
                <RiCheckLine className="h-4 w-4 mr-1" />
              ) : (
                <RiSaveLine className="h-4 w-4 mr-1" />
              )}
              {saving ? "Guardando..." : saved ? "Guardado" : "Guardar"}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-6 pt-3">
          <TabsList>
            <TabsTrigger value="design" className="gap-2">
              <RiPaletteLine className="h-4 w-4" /> Diseño
            </TabsTrigger>
            <TabsTrigger value="fields" className="gap-2">
              <RiLayoutLine className="h-4 w-4" /> Campos
            </TabsTrigger>
            <TabsTrigger value="responses" className="gap-2">
              <RiFileList2Line className="h-4 w-4" /> Respuestas
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <RiEyeLine className="h-4 w-4" /> Preview
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <RiSettings4Line className="h-4 w-4" /> Configuración
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Design Tab */}
        <TabsContent value="design" className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Basic Info */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Información básica</h2>
              <div className="space-y-3">
                <div>
                  <Label>Nombre del formulario</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Briefing de boda" />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe el propósito del formulario..."
                    rows={3}
                  />
                </div>
              </div>
            </section>

            {/* Cover & Logo */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Cover y Logo</h2>
              {/* Cover Image */}
              <div>
                <Label className="mb-2 block">Imagen de portada</Label>
                {coverImage ? (
                  <div className="relative h-40 rounded-lg overflow-hidden group">
                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => document.getElementById("cover-upload")?.click()}
                      >
                        Cambiar
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setCoverImage(null)}
                      >
                        <RiCloseLine className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="cover-upload"
                    className="h-40 rounded-lg bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors border-2 border-dashed border-muted-foreground/25"
                  >
                    <div className="text-center text-muted-foreground">
                      {uploadingCover ? (
                        <RiLoader4Line className="h-8 w-8 mx-auto mb-2 animate-spin" />
                      ) : (
                        <RiImageAddLine className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      )}
                      <p className="text-sm">{uploadingCover ? "Subiendo..." : "Agregar cover"}</p>
                      <p className="text-xs mt-1">JPG, PNG hasta 10MB · Ideal: 1200×400px</p>
                    </div>
                  </label>
                )}
                <input
                  type="file"
                  id="cover-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ""; }}
                />
              </div>
              {/* Logo */}
              <div>
                <Label className="mb-2 block">Logo</Label>
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <div className="relative h-16 w-16 rounded-lg overflow-hidden group border">
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setLogoUrl(null)}
                        >
                          <RiCloseLine className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="logo-upload"
                      className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors border-2 border-dashed border-muted-foreground/25"
                    >
                      {uploadingLogo ? (
                        <RiLoader4Line className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <RiImageAddLine className="h-5 w-5 text-muted-foreground opacity-50" />
                      )}
                    </label>
                  )}
                  <div className="text-sm text-muted-foreground">
                    <p>{logoUrl ? "Logo cargado" : "Sin logo"}</p>
                    <p className="text-xs">Ideal: 200×200px, fondo transparente</p>
                    <button
                      type="button"
                      className="text-primary hover:underline text-xs"
                      onClick={() => document.getElementById("logo-upload")?.click()}
                    >
                      {logoUrl ? "Cambiar logo" : "Subir logo"}
                    </button>
                  </div>
                </div>
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ""; }}
                />
              </div>
            </section>

            {/* Appearance */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Apariencia</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Color principal</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1"
                      placeholder="#111827"
                    />
                  </div>
                </div>
                <div>
                  <Label>Texto del botón</Label>
                  <Input
                    value={submitButtonText}
                    onChange={(e) => setSubmitButtonText(e.target.value)}
                    placeholder="Enviar"
                  />
                </div>
              </div>
            </section>

            {/* Thank You */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Página de agradecimiento</h2>
              <div className="space-y-3">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={thankYouTitle}
                    onChange={(e) => setThankYouTitle(e.target.value)}
                    placeholder="¡Gracias!"
                  />
                </div>
                <div>
                  <Label>Mensaje</Label>
                  <Textarea
                    value={thankYouMessage}
                    onChange={(e) => setThankYouMessage(e.target.value)}
                    placeholder="Tu respuesta ha sido registrada."
                    rows={2}
                  />
                </div>
                <div>
                  <Label>URL de redirección (opcional)</Label>
                  <Input
                    value={redirectUrl}
                    onChange={(e) => setRedirectUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Si se indica, redirige al usuario a esta URL después de enviar.
                  </p>
                </div>
              </div>
            </section>

            {/* Fields summary */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Campos</h2>
                <Badge variant="secondary">{form.fields?.length || 0} campos</Badge>
              </div>
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                <p className="text-sm">
                  Usa el tab <strong>Campos</strong> para agregar, ordenar y configurar los campos del formulario.
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setActiveTab("fields")}>
                  <RiLayoutLine className="h-4 w-4 mr-2" /> Ir al editor de campos
                </Button>
              </div>
            </section>
          </div>
        </TabsContent>

        {/* Fields Tab */}
        <TabsContent value="fields" className="flex-1 overflow-hidden">
          <FormBuilder
            formId={formId}
            initialFields={(form.fields || []).map((f, idx) => ({
              id: `db-${f.id}`,
              type: f.type,
              label: f.label,
              placeholder: f.placeholder || "",
              required: f.required ?? false,
              crmMapping: f.crmMapping,
              options: f.options,
              sortOrder: f.sortOrder ?? idx,
              config: (f.config as Record<string, unknown>) || {},
              dbId: f.id,
            }))}
            onSave={async (fields) => {
              const res = await fetch(`/api/forms/${formId}/fields`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fields: fields.map((f) => ({
                    type: f.type,
                    label: f.label,
                    placeholder: f.placeholder || null,
                    required: f.required,
                    crmMapping: f.crmMapping,
                    options: f.options,
                    sortOrder: f.sortOrder,
                    config: f.config,
                  })),
                }),
              });
              const data = await res.json();
              if (data.success) {
                fetchForm();
              }
            }}
          />
        </TabsContent>

        {/* Responses Tab */}
        <TabsContent value="responses" className="flex-1 overflow-y-auto p-6">
          <SubmissionsTab formId={formId} fields={form.fields || []} />
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="flex-1 overflow-y-auto">
          <div className="min-h-full bg-gray-100 py-8 px-4">
            <div className="max-w-xl mx-auto">
              {/* Cover Image */}
              {coverImage && (
                <div className="h-44 rounded-t-2xl overflow-hidden -mb-4">
                  <img src={coverImage} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {/* Form Card */}
              <div className={`bg-white shadow-sm border p-6 space-y-5 ${coverImage ? "rounded-b-2xl" : "rounded-2xl"}`}>
                {/* Header */}
                <div className="text-center pb-2">
                  {logoUrl && (
                    <img src={logoUrl} alt="" className="h-12 mx-auto mb-3 object-contain" />
                  )}
                  <h1 className="text-2xl font-bold text-gray-900">{name || "Sin nombre"}</h1>
                  {description && <p className="text-gray-600 mt-2">{description}</p>}
                </div>

                {/* Fields preview */}
                {(form.fields || []).map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    {field.type === "section_title" ? (
                      <h2 className="text-lg font-semibold text-gray-900 pt-2">{field.label}</h2>
                    ) : field.type === "descriptive_text" ? (
                      <p className="text-sm text-gray-600">{field.label}</p>
                    ) : field.type === "separator" ? (
                      <hr className="border-gray-200" />
                    ) : (
                      <>
                        <label className="text-sm font-medium text-gray-700">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        {["message", "long_text"].includes(field.type) ? (
                          <div className="w-full h-20 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400">
                            {field.placeholder || ""}
                          </div>
                        ) : ["single_select", "multi_select"].includes(field.type) ? (
                          <div className="space-y-1.5">
                            {((field.options as { choices?: { label: string; value: string }[] })?.choices || []).slice(0, 3).map((opt, i) => (
                              <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 p-2.5">
                                <div className={`h-4 w-4 border-2 border-gray-300 ${field.type === "single_select" ? "rounded-full" : "rounded"}`} />
                                <span className="text-sm text-gray-700">{opt.label}</span>
                              </div>
                            ))}
                          </div>
                        ) : field.type === "checkbox" ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded border-2 border-gray-300" />
                            <span className="text-sm text-gray-700">{field.label}</span>
                          </div>
                        ) : field.type === "image_select" ? (
                          <div className="grid grid-cols-2 gap-2">
                            {((field.options as { choices?: { label: string; value: string; imageUrl?: string }[] })?.choices || []).slice(0, 4).map((opt, i) => (
                              <div key={i} className="rounded-xl border-2 border-gray-200 overflow-hidden">
                                {opt.imageUrl ? (
                                  <img src={opt.imageUrl} alt={opt.label} className="w-full h-20 object-cover" />
                                ) : (
                                  <div className="w-full h-20 bg-gray-100 flex items-center justify-center text-xs text-gray-400">Sin imagen</div>
                                )}
                                <p className="text-xs font-medium p-1.5 text-center">{opt.label}</p>
                              </div>
                            ))}
                          </div>
                        ) : field.type === "event_date" ? (
                          <div className="w-full h-10 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center text-sm text-gray-400">
                            dd/mm/aaaa
                          </div>
                        ) : (
                          <div className="w-full h-10 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center text-sm text-gray-400">
                            {field.placeholder || ""}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}

                {/* GDPR Preview */}
                {gdprEnabled && (
                  <div className="flex items-start gap-3 pt-2">
                    <div className="h-4 w-4 rounded border-2 border-gray-300 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-600 leading-snug">
                      {gdprText || "Acepto la política de privacidad."}
                      {gdprLink && <span className="text-blue-600 underline ml-1">Ver política</span>}
                    </p>
                  </div>
                )}

                {/* Submit button preview */}
                <button
                  type="button"
                  className="w-full h-11 rounded-md text-white font-medium text-base"
                  style={{ backgroundColor: primaryColor || "#111827" }}
                >
                  {submitButtonText || "Enviar"}
                </button>
              </div>

              {/* Footer */}
              <p className="text-center text-xs text-gray-400 mt-6">Formulario creado con HubEnts</p>
            </div>
          </div>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Notifications */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Notificaciones</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Notificar al recibir respuesta</p>
                    <p className="text-xs text-muted-foreground">
                      Recibe una notificación cada vez que alguien envía el formulario
                    </p>
                  </div>
                  <Switch checked={notifyOnResponse} onCheckedChange={setNotifyOnResponse} />
                </div>
                {notifyOnResponse && (
                  <div>
                    <Label>Email de notificación (opcional)</Label>
                    <Input
                      type="email"
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      placeholder="Si vacío, se usa el email del owner"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* GDPR */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Privacidad (GDPR)</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Activar consentimiento GDPR</p>
                    <p className="text-xs text-muted-foreground">
                      Agrega una casilla de aceptación de política de privacidad
                    </p>
                  </div>
                  <Switch checked={gdprEnabled} onCheckedChange={setGdprEnabled} />
                </div>
                {gdprEnabled && (
                  <GdprFields
                    gdprText={gdprText}
                    setGdprText={setGdprText}
                    gdprLink={gdprLink}
                    setGdprLink={setGdprLink}
                    formName={name}
                    formDescription={description}
                    fieldTypes={(form.fields || []).map((f) => f.type)}
                  />
                )}
              </div>
            </section>

            {/* Instances */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Instancias y Vinculaciones</h2>
              </div>
              <InstancesSection formId={form.id} instances={form.instances || []} onRefresh={fetchForm} />
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const GDPR_TEMPLATES = [
  { label: "Eventos", text: "Acepto que mis datos sean tratados para la gestión y coordinación del evento. Puedo ejercer mis derechos de acceso, rectificación y supresión contactando al organizador." },
  { label: "Captación de leads", text: "Consiento el tratamiento de mis datos personales para recibir información sobre servicios de organización de eventos. Puedo revocar este consentimiento en cualquier momento." },
  { label: "Genérico", text: "Acepto la política de privacidad y el tratamiento de mis datos para la finalidad indicada en este formulario." },
];

interface GdprFieldsProps {
  gdprText: string;
  setGdprText: (v: string) => void;
  gdprLink: string;
  setGdprLink: (v: string) => void;
  formName: string;
  formDescription: string;
  fieldTypes: string[];
}

function GdprFields({ gdprText, setGdprText, gdprLink, setGdprLink, formName, formDescription, fieldTypes }: GdprFieldsProps) {
  const [generating, setGenerating] = useState(false);

  const generateWithEnti = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-gdpr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formName, formDescription, fieldTypes }),
      });
      const data = await res.json();
      if (data.success && data.text) {
        setGdprText(data.text);
        toast.success("Texto GDPR generado con ENTI");
      } else {
        toast.error(data.error || "Error al generar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Texto del consentimiento</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generateWithEnti}
            disabled={generating}
            className="gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50 hover:text-violet-700"
          >
            {generating ? (
              <RiLoader4Line className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RiSparklingLine className="h-3.5 w-3.5" />
            )}
            {generating ? "Generando..." : "Generar con ENTI"}
          </Button>
        </div>
        <Textarea
          value={gdprText}
          onChange={(e) => setGdprText(e.target.value)}
          placeholder="Acepto la política de privacidad."
          rows={3}
        />
        <div className="flex gap-2 mt-2">
          {GDPR_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              onClick={() => setGdprText(tpl.text)}
              className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Link a política de privacidad</Label>
        <Input
          value={gdprLink}
          onChange={(e) => setGdprLink(e.target.value)}
          placeholder="https://..."
        />
      </div>
    </>
  );
}

interface InstanceData {
  id: number;
  type: string;
  slug: string | null;
  eventId: number | null;
  taskId: number | null;
  status: string;
  createdAt: string | null;
}

function InstancesSection({ formId, instances, onRefresh }: { formId: number; instances: InstanceData[]; onRefresh: () => void }) {
  const [creatingLanding, setCreatingLanding] = useState(false);
  const [showEventSelector, setShowEventSelector] = useState(false);
  const [events, setEvents] = useState<Array<{ id: number; name: string }>>([]);
  const [eventTasks, setEventTasks] = useState<Array<{ id: number; title: string }>>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [linking, setLinking] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const createLanding = async () => {
    setCreatingLanding(true);
    try {
      const res = await fetch(`/api/forms/${formId}/instances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "landing" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Link público creado");
        onRefresh();
      } else {
        toast.error(data.error || "Error al crear instancia");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setCreatingLanding(false);
    }
  };

  const openEventSelector = async () => {
    setShowEventSelector(true);
    try {
      const res = await fetch("/api/events?limit=50");
      const data = await res.json();
      if (data.success) setEvents(data.data || []);
    } catch { /* silent */ }
  };

  const fetchTasksForEvent = async (eventId: number) => {
    setSelectedEventId(eventId);
    setSelectedTaskId(null);
    try {
      const res = await fetch(`/api/tasks?eventId=${eventId}`);
      const data = await res.json();
      if (data.success) setEventTasks(data.data || []);
    } catch { /* silent */ }
  };

  const linkToContext = async () => {
    if (!selectedEventId) return;
    setLinking(true);
    try {
      const body: Record<string, unknown> = {
        type: selectedTaskId ? "task" : "landing",
        eventId: selectedEventId,
      };
      if (selectedTaskId) body.taskId = selectedTaskId;

      const res = await fetch(`/api/forms/${formId}/instances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(selectedTaskId ? "Vinculado a tarea" : "Vinculado a evento");
        setShowEventSelector(false);
        setSelectedEventId(null);
        setSelectedTaskId(null);
        onRefresh();
      } else {
        toast.error(data.error || "Error al vincular");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLinking(false);
    }
  };

  const deleteInstance = async (instanceId: number) => {
    if (!confirm("¿Eliminar esta instancia?")) return;
    setDeleting(instanceId);
    try {
      const res = await fetch(`/api/forms/instances/${instanceId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Instancia eliminada");
        onRefresh();
      }
    } catch { /* silent */ }
    finally { setDeleting(null); }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado al portapapeles");
  };

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={createLanding} disabled={creatingLanding}>
          <RiGlobeLine className="h-3.5 w-3.5" />
          {creatingLanding ? "Creando..." : "Crear link público"}
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={openEventSelector}>
          <RiCalendarEventLine className="h-3.5 w-3.5" />
          Vincular a evento / tarea
        </Button>
      </div>

      {/* Event/Task selector dialog */}
      {showEventSelector && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Seleccionar evento</p>
            <Button variant="ghost" size="sm" onClick={() => setShowEventSelector(false)}>Cancelar</Button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {events.map((ev) => (
              <button
                key={ev.id}
                onClick={() => fetchTasksForEvent(ev.id)}
                className={`text-left text-sm p-2 rounded border transition-colors ${selectedEventId === ev.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
              >
                {ev.name}
              </button>
            ))}
            {events.length === 0 && <p className="text-sm text-muted-foreground col-span-2">No hay eventos</p>}
          </div>

          {selectedEventId && (
            <>
              <div>
                <p className="text-sm font-medium mb-2">Tarea (opcional)</p>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  <button
                    onClick={() => setSelectedTaskId(null)}
                    className={`text-left text-sm p-2 rounded border transition-colors ${selectedTaskId === null ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                  >
                    Solo evento (sin tarea)
                  </button>
                  {eventTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`text-left text-sm p-2 rounded border transition-colors ${selectedTaskId === task.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                    >
                      {task.title}
                    </button>
                  ))}
                </div>
              </div>
              <Button size="sm" onClick={linkToContext} disabled={linking} className="gap-1.5">
                <RiLinkM className="h-3.5 w-3.5" />
                {linking ? "Vinculando..." : "Vincular"}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Existing instances */}
      {instances.length > 0 ? (
        <div className="space-y-2">
          {instances.map((inst) => (
            <div key={inst.id} className="flex items-center justify-between rounded-lg border p-3 group">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="text-xs shrink-0">
                  {inst.type === "landing" ? (
                    <><RiGlobeLine className="h-3 w-3 mr-1" />Landing</>
                  ) : (
                    <><RiTaskLine className="h-3 w-3 mr-1" />Tarea</>
                  )}
                </Badge>
                {inst.slug && (
                  <button onClick={() => copyLink(inst.slug!)} className="text-sm text-primary hover:underline truncate" title="Copiar link">
                    /f/{inst.slug}
                  </button>
                )}
                {inst.eventId && !inst.taskId && (
                  <span className="text-xs text-muted-foreground">Evento #{inst.eventId}</span>
                )}
                {inst.taskId && (
                  <span className="text-xs text-muted-foreground">Tarea #{inst.taskId}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={inst.status === "active" ? "default" : "secondary"} className="text-xs">
                  {inst.status === "active" ? "Activo" : inst.status}
                </Badge>
                {inst.slug && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => copyLink(inst.slug!)} title="Copiar link">
                    <RiFileCopyLine className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={() => deleteInstance(inst.id)}
                  disabled={deleting === inst.id}
                  title="Eliminar"
                >
                  <RiDeleteBinLine className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          <RiLinkM className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay instancias creadas aún.</p>
          <p className="text-xs mt-1">
            Usa los botones de arriba para crear un link público o vincular a un evento/tarea.
          </p>
        </div>
      )}
    </div>
  );
}

interface SubmissionRow {
  id: number;
  data: Record<string, unknown>;
  respondentName: string | null;
  respondentEmail: string | null;
  createdAt: string;
}

function SubmissionsTab({ formId, fields }: { formId: number; fields: FieldData[] }) {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/forms/${formId}/submissions?limit=50`);
        const data = await res.json();
        if (data.success) {
          setSubmissions(data.data);
          setTotal(data.meta?.total ?? 0);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [formId]);

  const fieldLabels = fields
    .filter((f) => !["section_title", "descriptive_text", "separator"].includes(f.type))
    .slice(0, 6);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <RiFileList2Line className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <h3 className="text-base font-medium">Sin respuestas</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Las respuestas aparecerán aquí cuando alguien envíe el formulario.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} respuestas</p>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">#</th>
              <th className="text-left px-4 py-2 font-medium">Nombre</th>
              <th className="text-left px-4 py-2 font-medium">Email</th>
              {fieldLabels.map((f) => (
                <th key={f.id} className="text-left px-4 py-2 font-medium truncate max-w-37.5">
                  {f.label}
                </th>
              ))}
              <th className="text-left px-4 py-2 font-medium">Fecha</th>
              <th className="text-left px-4 py-2 font-medium">PDF</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub, idx) => (
              <tr key={sub.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 text-muted-foreground">{idx + 1}</td>
                <td className="px-4 py-2">{sub.respondentName || "—"}</td>
                <td className="px-4 py-2">{sub.respondentEmail || "—"}</td>
                {fieldLabels.map((f) => (
                  <td key={f.id} className="px-4 py-2 truncate max-w-37.5">
                    {formatCellValue(sub.data[f.label])}
                  </td>
                ))}
                <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                  {new Date(sub.createdAt).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-2">
                  <DownloadPDFButton formId={formId} submissionId={sub.id} formName={`Respuesta_${sub.id}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DownloadPDFButton({ formId, submissionId, formName }: { formId: number; submissionId: number; formName: string }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { downloadPDFFromHTML } = await import("@/lib/pdf-download");
      await downloadPDFFromHTML(
        `/api/forms/${formId}/submissions/${submissionId}/pdf?format=html`,
        `${formName}.pdf`
      );
    } catch {
      toast.error("Error al descargar PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={handleDownload}
      disabled={downloading}
      title="Descargar PDF"
    >
      {downloading ? (
        <RiLoader4Line className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RiFileCopyLine className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}
