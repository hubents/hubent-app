"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { Btn, Inp, Ta, Pill } from "@/components/ui/ds";
import { Label } from "@/components/ui/label";
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
  RiExternalLinkLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { useUserSession } from "@/hooks/use-user-session";
import { FormBuilder, type BuilderField } from "@/components/forms/form-builder";
import { useFileUpload } from "@/hooks/use-file-upload";
import { ShareFormDialog } from "@/components/forms/share-form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { appConfirm } from "@/lib/confirm";

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
  return <FormEditorContent />;
}

export function FormEditorContent({ backPath = "/dashboard/forms" }: { backPath?: string }) {
  const t = useTranslations("forms");
  const params = useParams();
  const router = useRouter();
  const { can, loading: sessionLoading } = useUserSession();
  const canEdit = sessionLoading ? true : can("forms:update");
  const formId = Number(params.id);

  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("design");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

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
  const [crmCreateContact, setCrmCreateContact] = useState(true);
  const [crmCreateLead, setCrmCreateLead] = useState(true);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);

  // Builder fields state (lifted from FormBuilder to prevent data loss on tab switch)
  const [builderFields, setBuilderFields] = useState<BuilderField[]>([]);
  const lastSavedRef = useRef<string>("");

  const { upload: uploadCover, uploading: uploadingCover } = useFileUpload({
    folder: `forms/${formId}/cover`,
    allowedTypes: ["image/*"],
    onSuccess: (result) => {
      setCoverImage(result.url);
      toast.success(t("coverUploaded"));
    },
  });

  const { upload: uploadLogo, uploading: uploadingLogo } = useFileUpload({
    folder: `forms/${formId}/logo`,
    allowedTypes: ["image/*"],
    onSuccess: (result) => {
      setLogoUrl(result.url);
      toast.success(t("logoUploaded"));
    },
  });

  const mapFieldsToBuilder = useCallback((fields: FieldData[]): BuilderField[] => {
    return (fields || []).map((f, idx) => ({
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
    }));
  }, []);

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
        setCrmCreateContact(f.crmCreateContact ?? true);
        setCrmCreateLead(f.crmCreateLead ?? true);
        const mapped = mapFieldsToBuilder(f.fields);
        setBuilderFields(mapped);
        lastSavedRef.current = JSON.stringify({ meta: { name: f.name, description: f.description || "", primaryColor: f.primaryColor || "#111827", submitButtonText: f.submitButtonText || "Enviar", thankYouTitle: f.thankYouTitle || "", thankYouMessage: f.thankYouMessage || "", redirectUrl: f.redirectUrl || "", notifyOnResponse: f.notifyOnResponse ?? true, notifyEmail: f.notifyEmail || "", gdprEnabled: f.gdprEnabled ?? false, gdprText: f.gdprText || "", gdprLink: f.gdprLink || "", coverImage: f.coverImage || null, logoUrl: f.logoUrl || null, crmCreateContact: f.crmCreateContact ?? true, crmCreateLead: f.crmCreateLead ?? true }, fields: mapped.map(({ id, dbId, ...rest }) => rest) });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [formId, mapFieldsToBuilder]);

  useEffect(() => { fetchForm(); }, [fetchForm]);

  const currentSnapshot = useMemo(() => JSON.stringify({
    meta: { name, description, primaryColor, submitButtonText, thankYouTitle, thankYouMessage, redirectUrl, notifyOnResponse, notifyEmail, gdprEnabled, gdprText, gdprLink, coverImage, logoUrl, crmCreateContact, crmCreateLead },
    fields: builderFields.map(({ id, dbId, ...rest }) => rest),
  }), [name, description, primaryColor, submitButtonText, thankYouTitle, thankYouMessage, redirectUrl, notifyOnResponse, notifyEmail, gdprEnabled, gdprText, gdprLink, coverImage, logoUrl, crmCreateContact, crmCreateLead, builderFields]);

  const hasUnsavedChanges = lastSavedRef.current !== "" && currentSnapshot !== lastSavedRef.current;

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const metaPayload = {
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
        crmCreateContact,
        crmCreateLead,
      };
      const fieldsPayload = {
        fields: builderFields.map((f) => ({
          type: f.type,
          label: f.label,
          placeholder: f.placeholder || null,
          required: f.required,
          crmMapping: f.crmMapping,
          options: f.options,
          sortOrder: f.sortOrder,
          config: f.config,
        })),
      };
      const [metaRes, fieldsRes] = await Promise.all([
        fetch(`/api/forms/${formId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metaPayload),
        }),
        fetch(`/api/forms/${formId}/fields`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fieldsPayload),
        }),
      ]);
      const metaData = await metaRes.json();
      const fieldsData = await fieldsRes.json();
      if (metaData.success && fieldsData.success) {
        setForm((prev) => prev ? { ...prev, ...metaData.data } : prev);
        const mapped = mapFieldsToBuilder(fieldsData.data || []);
        setBuilderFields(mapped);
        lastSavedRef.current = currentSnapshot;
        setSaved(true);
        toast.success(t("formSaved"));
        setTimeout(() => setSaved(false), 2000);
      } else {
        const errors: string[] = [];
        if (!metaData.success) errors.push(metaData.error || t("errorSaveConfig"));
        if (!fieldsData.success) errors.push(fieldsData.error || t("errorSaveFields"));
        toast.error(errors.join(". "));
      }
    } catch {
      toast.error(t("errorConnection"));
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
        <p className="text-muted-foreground">{t("formNotFound")}</p>
        <Btn variant="ghost" style={{ marginTop: 16 }} onClick={() => router.push(backPath)}>
          <RiArrowLeftLine className="h-4 w-4 mr-2" /> {t("back")}
        </Btn>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: t("statusDraft"), color: "bg-gray-100 text-gray-700" },
    active: { label: t("statusActive"), color: "bg-emerald-100 text-emerald-700" },
    paused: { label: t("statusPaused"), color: "bg-amber-100 text-amber-700" },
  };
  const st = statusConfig[form.status] || statusConfig.draft;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <button style={{ background: "transparent", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8 }} onClick={() => router.push(backPath)}>
            <RiArrowLeftLine className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Inp
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0"
                placeholder={t("labelFormName")}
                disabled={!canEdit}
              />
              <Pill className={st.color}>{st.label}</Pill>
              {(() => {
                const landingSlug = form.instances?.find((i) => i.type === "landing" && i.slug)?.slug;
                if (!landingSlug) return null;
                return (
                  <button
                    onClick={() => setShareDialogOpen(true)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline ml-1"
                  >
                    <RiGlobeLine className="h-3.5 w-3.5" />
                    {t("share")}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && form.status === "draft" && (
            <Btn variant="outline" size="sm" onClick={() => setActivateDialogOpen(true)}>
              <RiPlayLine className="h-4 w-4 mr-1" /> {t("activate")}
            </Btn>
          )}
          {canEdit && form.status === "active" && (
            <Btn variant="outline" size="sm" onClick={() => handleStatusChange("paused")}>
              <RiPauseLine className="h-4 w-4 mr-1" /> {t("pause")}
            </Btn>
          )}
          {canEdit && form.status === "paused" && (
            <Btn variant="outline" size="sm" onClick={() => handleStatusChange("active")}>
              <RiPlayLine className="h-4 w-4 mr-1" /> {t("reactivate")}
            </Btn>
          )}

          {canEdit && (
            <Btn onClick={handleSave} disabled={saving} style={{ position: "relative" }}>
              {saving ? (
                <RiLoader4Line className="h-4 w-4 mr-1 animate-spin" />
              ) : saved ? (
                <RiCheckLine className="h-4 w-4 mr-1" />
              ) : (
                <RiSaveLine className="h-4 w-4 mr-1" />
              )}
              {saving ? t("saving") : saved ? t("saved") : t("saveForm")}
              {hasUnsavedChanges && !saving && !saved && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500" />
              )}
            </Btn>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-6 pt-3">
          <TabsList>
            <TabsTrigger value="design" className="gap-2">
              <RiPaletteLine className="h-4 w-4" /> {t("tabDesign")}
            </TabsTrigger>
            <TabsTrigger value="fields" className="gap-2">
              <RiLayoutLine className="h-4 w-4" /> {t("tabFields")}
            </TabsTrigger>
            <TabsTrigger value="responses" className="gap-2">
              <RiFileList2Line className="h-4 w-4" /> {t("viewResponses")}
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <RiEyeLine className="h-4 w-4" /> {t("tabPreview")}
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <RiSettings4Line className="h-4 w-4" /> {t("tabConfig")}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Design Tab */}
        <TabsContent value="design" className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Basic Info */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">{t("sectionBasicInfo")}</h2>
              <div className="space-y-3">
                <div>
                  <Label>{t("labelFormName")}</Label>
                  <Inp value={name} onChange={(e) => setName(e.target.value)} placeholder={t("placeholderFormNameBrief")} />
                </div>
                <div>
                  <Label>{t("labelDescription")}</Label>
                  <Ta
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("placeholderDescription")}
                    rows={3}
                  />
                </div>
              </div>
            </section>

            {/* Cover & Logo */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">{t("sectionCoverLogo")}</h2>
              {/* Cover Image */}
              <div>
                <Label className="mb-2 block">{t("labelCoverImage")}</Label>
                {coverImage ? (
                  <div className="relative h-40 rounded-lg overflow-hidden group">
                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Btn
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => document.getElementById("cover-upload")?.click()}
                      >
                        {t("change")}
                      </Btn>
                      <Btn
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => setCoverImage(null)}
                      >
                        <RiCloseLine className="h-4 w-4" />
                      </Btn>
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
                      <p className="text-sm">{uploadingCover ? t("uploading") : t("addCover")}</p>
                      <p className="text-xs mt-1">{t("coverHint")}</p>
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
                <Label className="mb-2 block">{t("labelLogo")}</Label>
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <div className="relative h-16 w-16 rounded-lg overflow-hidden group border">
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          style={{ background: "#C0392B", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 6, color: "#fff" }}
                          onClick={() => setLogoUrl(null)}
                        >
                          <RiCloseLine className="h-3.5 w-3.5" />
                        </button>
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
                    <p>{logoUrl ? t("logoLoaded") : t("noLogo")}</p>
                    <p className="text-xs">{t("logoHint")}</p>
                    <button
                      type="button"
                      className="text-primary hover:underline text-xs"
                      onClick={() => document.getElementById("logo-upload")?.click()}
                    >
                      {logoUrl ? t("changeLogo") : t("uploadLogo")}
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
              <h2 className="text-lg font-semibold">{t("sectionAppearance")}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("labelPrimaryColor")}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-10 rounded border cursor-pointer"
                    />
                    <Inp
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1"
                      placeholder="#111827"
                    />
                  </div>
                </div>
                <div>
                  <Label>{t("labelButtonText")}</Label>
                  <Inp
                    value={submitButtonText}
                    onChange={(e) => setSubmitButtonText(e.target.value)}
                    placeholder={t("placeholderButtonText")}
                  />
                </div>
              </div>
            </section>

            {/* Thank You */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">{t("sectionThankYou")}</h2>
              <div className="space-y-3">
                <div>
                  <Label>{t("labelTitle")}</Label>
                  <Inp
                    value={thankYouTitle}
                    onChange={(e) => setThankYouTitle(e.target.value)}
                    placeholder={t("placeholderThankYouTitle")}
                  />
                </div>
                <div>
                  <Label>{t("labelMessage")}</Label>
                  <Ta
                    value={thankYouMessage}
                    onChange={(e) => setThankYouMessage(e.target.value)}
                    placeholder={t("placeholderThankYouMessage")}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>{t("labelRedirectUrl")}</Label>
                  <Inp
                    value={redirectUrl}
                    onChange={(e) => setRedirectUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("redirectUrlHint")}
                  </p>
                </div>
              </div>
            </section>

            {/* Fields summary */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t("tabFields")}</h2>
                <Pill bg="var(--bg-subtle)" color="var(--ink-2)">{builderFields.length} {t("statFields").toLowerCase()}</Pill>
              </div>
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                <p className="text-sm">
                  {t("fieldsHint")}
                </p>
                <Btn variant="outline" size="sm" style={{ marginTop: 12 }} onClick={() => setActiveTab("fields")}>
                  <RiLayoutLine className="h-4 w-4 mr-2" /> {t("goToFieldEditor")}
                </Btn>
              </div>
            </section>
          </div>
        </TabsContent>

        {/* Fields Tab */}
        <TabsContent value="fields" className="flex-1 overflow-hidden">
          <FormBuilder
            formId={formId}
            readOnly={form.status !== "draft"}
            fields={builderFields}
            onFieldsChange={setBuilderFields}
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
                  <h1 className="text-2xl font-bold text-gray-900">{name || t("noName")}</h1>
                  {description && <p className="text-gray-600 mt-2">{description}</p>}
                </div>

                {/* Fields preview */}
                {builderFields.map((field) => (
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
                                  <div className="w-full h-20 bg-gray-100 flex items-center justify-center text-xs text-gray-400">{t("noImage")}</div>
                                )}
                                <p className="text-xs font-medium p-1.5 text-center">{opt.label}</p>
                              </div>
                            ))}
                          </div>
                        ) : field.type === "signature" ? (
                          <div className="w-full h-[100px] rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-sm text-gray-400">
                            {t("digitalSignature")}
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
                      {gdprLink && <span className="text-blue-600 underline ml-1">{t("viewPolicy")}</span>}
                    </p>
                  </div>
                )}

                {/* Submit button preview */}
                <button
                  type="button"
                  className="w-full h-11 rounded-md text-white font-medium text-base"
                  style={{ backgroundColor: primaryColor || "#111827" }}
                >
                  {submitButtonText || t("placeholderButtonText")}
                </button>
              </div>

              {/* Footer */}
              <p className="text-center text-xs text-gray-400 mt-6">{t("footerCreatedWith")}</p>
            </div>
          </div>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Notifications */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">{t("sectionNotifications")}</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t("notifyOnResponse")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("notifyOnResponseDesc")}
                    </p>
                  </div>
                  <Switch checked={notifyOnResponse} onCheckedChange={setNotifyOnResponse} />
                </div>
                {notifyOnResponse && (
                  <div>
                    <Label>{t("labelNotifyEmail")}</Label>
                    <Inp
                      type="email"
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      placeholder={t("placeholderNotifyEmail")}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* CRM Behavior */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">{t("sectionCrm")}</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t("crmCreateContact")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("crmCreateContactDesc")}
                    </p>
                  </div>
                  <Switch checked={crmCreateContact} onCheckedChange={setCrmCreateContact} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t("crmCreateLead")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("crmCreateLeadDesc")}
                    </p>
                  </div>
                  <Switch checked={crmCreateLead} onCheckedChange={setCrmCreateLead} />
                </div>
              </div>
            </section>

            {/* GDPR */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">{t("sectionGdpr")}</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t("gdprEnable")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("gdprEnableDesc")}
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
                <h2 className="text-lg font-semibold">{t("sectionInstances")}</h2>
              </div>
              <InstancesSection formId={form.id} instances={form.instances || []} onRefresh={fetchForm} />
            </section>
          </div>
        </TabsContent>
      </Tabs>

      {(() => {
        const landingSlug = form.instances?.find((i) => i.type === "landing" && i.slug)?.slug;
        if (!landingSlug) return null;
        return (
          <ShareFormDialog
            slug={landingSlug}
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
          />
        );
      })()}

      <AlertDialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("activateTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {t("activateDesc1")}
              </span>
              <span className="block">
                {t("activateDesc2")}
              </span>
              <span className="block text-amber-700 font-medium">
                {t("activateDesc3")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleStatusChange("active")}>
              {t("activateForm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const GDPR_TEMPLATE_TEXTS = [
  "Acepto que mis datos sean tratados para la gestión y coordinación del evento. Puedo ejercer mis derechos de acceso, rectificación y supresión contactando al organizador.",
  "Consiento el tratamiento de mis datos personales para recibir información sobre servicios de organización de eventos. Puedo revocar este consentimiento en cualquier momento.",
  "Acepto la política de privacidad y el tratamiento de mis datos para la finalidad indicada en este formulario.",
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
  const t = useTranslations("forms");
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
        toast.success(t("gdprGenerated"));
      } else {
        toast.error(data.error || t("gdprGenerateError"));
      }
    } catch {
      toast.error(t("errorConnection"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>{t("labelConsentText")}</Label>
          <Btn
            type="button"
            variant="outline"
            size="sm"
            onClick={generateWithEnti}
            disabled={generating}
            style={{ color: "#7C3AED", borderColor: "#DDD6FE" }}
          >
            {generating ? (
              <RiLoader4Line className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RiSparklingLine className="h-3.5 w-3.5" />
            )}
            {generating ? t("generating") : t("generateWithHubIA")}
          </Btn>
        </div>
        <Ta
          value={gdprText}
          onChange={(e) => setGdprText(e.target.value)}
          placeholder={t("placeholderConsentText")}
          rows={3}
        />
        <div className="flex gap-2 mt-2">
          {([t("gdprTemplateEvents"), t("gdprTemplateLeads"), t("gdprTemplateGeneric")] as const).map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => setGdprText(GDPR_TEMPLATE_TEXTS[idx])}
              className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>{t("labelPrivacyLink")}</Label>
        <Inp
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
  const t = useTranslations("forms");
  const [shareSlug, setShareSlug] = useState<string | null>(null);
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
        toast.success(t("publicLinkCreated"));
        onRefresh();
      } else {
        toast.error(data.error || t("errorCreateInstance"));
      }
    } catch {
      toast.error(t("errorConnection"));
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
        toast.success(selectedTaskId ? t("linkedToTask") : t("linkedToEvent"));
        setShowEventSelector(false);
        setSelectedEventId(null);
        setSelectedTaskId(null);
        onRefresh();
      } else {
        toast.error(data.error || t("errorLink"));
      }
    } catch {
      toast.error(t("errorConnection"));
    } finally {
      setLinking(false);
    }
  };

  const deleteInstance = async (instanceId: number) => {
    if (!await appConfirm({ title: t("deleteInstanceTitle"), variant: "destructive", confirmLabel: t("delete") })) return;
    setDeleting(instanceId);
    try {
      const res = await fetch(`/api/forms/instances/${instanceId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success(t("instanceDeleted"));
        onRefresh();
      }
    } catch { /* silent */ }
    finally { setDeleting(null); }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success(t("linkCopied"));
  };

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Btn variant="outline" size="sm" onClick={createLanding} disabled={creatingLanding}>
          <RiGlobeLine className="h-3.5 w-3.5" />
          {creatingLanding ? t("creating") : t("createPublicLink")}
        </Btn>
        <Btn variant="outline" size="sm" onClick={openEventSelector}>
          <RiCalendarEventLine className="h-3.5 w-3.5" />
          {t("linkToEventTask")}
        </Btn>
      </div>

      {/* Event/Task selector dialog */}
      {showEventSelector && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("selectEvent")}</p>
            <Btn variant="ghost" size="sm" onClick={() => setShowEventSelector(false)}>{t("cancel")}</Btn>
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
            {events.length === 0 && <p className="text-sm text-muted-foreground col-span-2">{t("noEvents")}</p>}
          </div>

          {selectedEventId && (
            <>
              <div>
                <p className="text-sm font-medium mb-2">{t("labelTask")}</p>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  <button
                    onClick={() => setSelectedTaskId(null)}
                    className={`text-left text-sm p-2 rounded border transition-colors ${selectedTaskId === null ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                  >
                    {t("eventOnly")}
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
              <Btn size="sm" onClick={linkToContext} disabled={linking}>
                <RiLinkM className="h-3.5 w-3.5" />
                {linking ? t("linking") : t("link")}
              </Btn>
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
                <Pill style={{ border: "1px solid var(--line-strong)", flexShrink: 0 }} bg="transparent">
                  {inst.type === "landing" ? (
                    <><RiGlobeLine className="h-3 w-3 mr-1" />Landing</>
                  ) : (
                    <><RiTaskLine className="h-3 w-3 mr-1" />Tarea</>
                  )}
                </Pill>
                {inst.slug && (
                  <button onClick={() => copyLink(inst.slug!)} className="text-sm text-primary hover:underline truncate" title="Copiar link">
                    /f/{inst.slug}
                  </button>
                )}
                {inst.eventId && !inst.taskId && (
                  <span className="text-xs text-muted-foreground">{t("labelEvent")} #{inst.eventId}</span>
                )}
                {inst.taskId && (
                  <span className="text-xs text-muted-foreground">{t("labelTaskShort")} #{inst.taskId}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Pill
                  bg={inst.status === "active" ? "var(--color-primary)" : "var(--bg-subtle)"}
                  color={inst.status === "active" ? "#fff" : "var(--ink-2)"}
                >
                  {inst.status === "active" ? t("statusActive") : inst.status}
                </Pill>
                {inst.slug && (
                  <Btn variant="ghost" size="sm" style={{ height: 28, opacity: 0 }} className="group-hover:opacity-100" onClick={() => setShareSlug(inst.slug!)} title={t("share")}>
                    <RiGlobeLine className="h-3.5 w-3.5" />
                    {t("share")}
                  </Btn>
                )}
                <button
                  style={{ background: "transparent", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, color: "#C0392B", opacity: 0 }}
                  className="group-hover:opacity-100"
                  onClick={() => deleteInstance(inst.id)}
                  disabled={deleting === inst.id}
                  title={t("delete")}
                >
                  <RiDeleteBinLine className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          <RiLinkM className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t("noInstances")}</p>
          <p className="text-xs mt-1">
            {t("noInstancesHint")}
          </p>
        </div>
      )}

      {shareSlug && (
        <ShareFormDialog
          slug={shareSlug}
          open={!!shareSlug}
          onOpenChange={(open) => { if (!open) setShareSlug(null); }}
        />
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
  const t = useTranslations("forms");
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
        <h3 className="text-base font-medium">{t("noResponses")}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("noResponsesDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} {t("statResponses").toLowerCase()}</p>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">#</th>
              <th className="text-left px-4 py-2 font-medium">{t("colName")}</th>
              <th className="text-left px-4 py-2 font-medium">{t("colEmail")}</th>
              {fieldLabels.map((f) => (
                <th key={f.id} className="text-left px-4 py-2 font-medium truncate max-w-37.5">
                  {f.label}
                </th>
              ))}
              <th className="text-left px-4 py-2 font-medium">{t("colDate")}</th>
              <th className="text-left px-4 py-2 font-medium">{t("colPdf")}</th>
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
                    {formatCellValue(sub.data[f.label], t("yes"), t("no"))}
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
  const t = useTranslations("forms");
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
      toast.error(t("errorDownloadPdf"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      style={{ background: "transparent", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6 }}
      onClick={handleDownload}
      disabled={downloading}
      title={t("downloadPdf")}
    >
      {downloading ? (
        <RiLoader4Line className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RiFileCopyLine className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function formatCellValue(value: unknown, yes = "Sí", no = "No"): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? yes : no;
  return String(value);
}
