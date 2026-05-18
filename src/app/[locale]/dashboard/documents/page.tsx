"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  Search01Icon,
  FolderLibraryIcon,
  FileAttachmentIcon,
  Cancel01Icon,
  PencilEdit02Icon,
  Delete01Icon,
  CloudUploadIcon,
  ArrowLeft01Icon,
  EyeIcon,
  DownloadCircle01Icon,
  FileEditIcon,
  CheckmarkCircle02Icon,
  SentIcon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";

// ── Icon wrappers ─────────────────────────────────────────────────────────────
const IcoPlus    = ({ size = 14 }) => <HugeiconsIcon icon={PlusSignIcon}         size={size} strokeWidth={1.5} />;
const IcoSearch  = ({ size = 14 }) => <HugeiconsIcon icon={Search01Icon}         size={size} strokeWidth={1.5} />;
const IcoFolder  = ({ size = 18 }) => <HugeiconsIcon icon={FolderLibraryIcon}    size={size} strokeWidth={1.5} />;
const IcoFile    = ({ size = 22 }) => <HugeiconsIcon icon={FileAttachmentIcon}   size={size} strokeWidth={1.5} />;
const IcoX       = ({ size = 16 }) => <HugeiconsIcon icon={Cancel01Icon}         size={size} strokeWidth={1.5} />;
const IcoEdit    = ({ size = 13 }) => <HugeiconsIcon icon={PencilEdit02Icon}     size={size} strokeWidth={1.5} />;
const IcoTrash   = ({ size = 13 }) => <HugeiconsIcon icon={Delete01Icon}         size={size} strokeWidth={1.5} />;
const IcoUpload  = ({ size = 22 }) => <HugeiconsIcon icon={CloudUploadIcon}      size={size} strokeWidth={1.5} />;
const IcoBack    = ({ size = 14 }) => <HugeiconsIcon icon={ArrowLeft01Icon}       size={size} strokeWidth={1.5} />;
const IcoView    = ({ size = 13 }) => <HugeiconsIcon icon={EyeIcon}               size={size} strokeWidth={1.5} />;
const IcoDl      = ({ size = 13 }) => <HugeiconsIcon icon={DownloadCircle01Icon}  size={size} strokeWidth={1.5} />;
const IcoTemplate = ({ size = 13 }) => <HugeiconsIcon icon={FileEditIcon}         size={size} strokeWidth={1.5} />;
const IcoSign    = ({ size = 13 }) => <HugeiconsIcon icon={CheckmarkCircle02Icon} size={size} strokeWidth={1.5} />;
const IcoSent    = ({ size = 13 }) => <HugeiconsIcon icon={SentIcon}              size={size} strokeWidth={1.5} />;
const IcoClock   = ({ size = 13 }) => <HugeiconsIcon icon={Clock01Icon}           size={size} strokeWidth={1.5} />;

// ── Types ─────────────────────────────────────────────────────────────────────
interface DocFolder {
  id: number;
  name: string;
  color: string | null;
  sortOrder: number | null;
  fileCount: number;
}

interface OrgDoc {
  id: number;
  name: string;
  fileType: string | null;
  fileSize: number | null;
  storageUrl: string | null;
  storageKey: string | null;
  folderId: number | null;
  folderName: string | null;
  eventId: number | null;
  uploaderName: string | null;
  createdAt: string | null;
}

// ── File type styles ──────────────────────────────────────────────────────────
const FILE_TYPE_STYLE: Record<string, { bg: string; fg: string }> = {
  pdf:  { bg: "#FCE4E0", fg: "#B54632" },
  doc:  { bg: "#E8EFF7", fg: "#3A5B8A" },
  docx: { bg: "#E8EFF7", fg: "#3A5B8A" },
  xls:  { bg: "#E4EEEA", fg: "#3F6B4D" },
  xlsx: { bg: "#E4EEEA", fg: "#3F6B4D" },
  zip:  { bg: "#F4EDE0", fg: "#8A6F3A" },
  rar:  { bg: "#F4EDE0", fg: "#8A6F3A" },
  png:  { bg: "#EEE6F5", fg: "#6B3F8A" },
  jpg:  { bg: "#EEE6F5", fg: "#6B3F8A" },
  jpeg: { bg: "#EEE6F5", fg: "#6B3F8A" },
  mp4:  { bg: "#E8F4FB", fg: "#2B5F8A" },
  mov:  { bg: "#E8F4FB", fg: "#2B5F8A" },
};

const FOLDER_COLORS = ["#7FA890", "#6B8CE8", "#B54632", "#A8845C", "#9B7EB8", "#E89C6B", "#C97A7A", "#4F7A5E", "#5B8FE8"];

const fmtSize = (bytes: number | null): string => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

// timeAgo strings are produced outside JSX; translated via a dedicated hook instance in the component that calls it.
const timeAgo = (dateStr: string | null, tDoc: ReturnType<typeof useTranslations>): string => {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return tDoc("timeAgoToday");
  if (d === 1) return tDoc("timeAgoYesterday");
  if (d < 7) return tDoc("timeAgoDays", { d });
  if (d < 30) return tDoc("timeAgoWeeks", { w: Math.floor(d / 7) });
  return new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
};

// ── FolderIcon ────────────────────────────────────────────────────────────────
function FolderIcon({ color, size = 38 }: { color: string | null; size?: number }) {
  const c = color || "#7FA890";
  return (
    <div style={{ width: size, height: size * 0.78, position: "relative", flexShrink: 0 }}>
      {/* Tab */}
      <div style={{ position: "absolute", top: 0, left: 4, width: size * 0.4, height: size * 0.16, background: c, borderRadius: "3px 3px 0 0" }} />
      {/* Body */}
      <div style={{ position: "absolute", top: size * 0.12, inset: "auto 0 0 0", background: c, opacity: 0.75, borderRadius: "0 4px 4px 4px" }} />
    </div>
  );
}

// ── FileTypeIcon ──────────────────────────────────────────────────────────────
function FileTypeIcon({ type }: { type: string | null }) {
  const ext = (type || "").toLowerCase();
  const s = FILE_TYPE_STYLE[ext] || { bg: "var(--bg-subtle)", fg: "var(--ink-3)" };
  return (
    <div style={{ background: s.bg, borderRadius: 8, width: "100%", aspectRatio: "4/3", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: s.fg, gap: 4 }}>
      <IcoFile size={24} />
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>{ext || "—"}</div>
    </div>
  );
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ folderId, folders, onClose, onUpload }: { folderId: number | null; folders: DocFolder[]; onClose: () => void; onUpload: (doc: Partial<OrgDoc>) => Promise<void> }) {
  const t = useTranslations("documents");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("pdf");
  const [selectedFolderId, setSelectedFolderId] = useState<string>(folderId?.toString() || "");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect name from URL
  const handleUrlChange = (v: string) => {
    setUrl(v);
    if (!name) {
      const parts = v.split("/").filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && last.includes(".")) {
        const noQuery = last.split("?")[0];
        setName(noQuery);
        const ext = noQuery.split(".").pop() || "";
        if (ext) setType(ext.toLowerCase());
      }
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setSaving(true);
    try {
      // Presign upload
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, folder: "documents" }),
      });
      const presignData = await presignRes.json();
      if (!presignData.success) throw new Error(presignData.error?.message || t("errorPrepareUpload"));

      // Upload to R2
      await fetch(presignData.data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      const ext = file.name.split(".").pop() || "";
      await onUpload({
        name: file.name,
        fileType: ext.toLowerCase(),
        fileSize: file.size,
        storageKey: presignData.data.key,
        storageUrl: presignData.data.publicUrl || presignData.data.uploadUrl,
        folderId: selectedFolderId ? Number(selectedFolderId) : null,
      });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errorUploadFile"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLink = async () => {
    if (!url.trim() || !name.trim()) return;
    setSaving(true);
    try {
      await onUpload({
        name: name.trim(),
        fileType: type || null,
        storageUrl: url.trim(),
        folderId: selectedFolderId ? Number(selectedFolderId) : null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const [mode, setMode] = useState<"upload" | "link">("upload");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,0.35)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 440, background: "var(--bg-panel)", borderRadius: 16, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>{t("uploadModalTitle")}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4, borderRadius: 6, display: "flex" }}><IcoX /></button>
        </div>

        {/* Mode selector */}
        <div style={{ display: "flex", gap: 6 }}>
          {([["upload", `⬆️ ${t("modeUpload")}`], ["link", `🔗 ${t("modeLink")}`]] as const).map(([m, lbl]) => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "8px 0", borderRadius: "var(--r-sm)", border: `1.5px solid ${mode === m ? "var(--ink-1)" : "var(--line-1)"}`, background: mode === m ? "var(--bg-subtle)" : "transparent", color: mode === m ? "var(--ink-1)" : "var(--ink-3)", fontSize: 12.5, fontWeight: mode === m ? 600 : 400, cursor: "pointer" }}>
              {lbl}
            </button>
          ))}
        </div>

        {mode === "upload" ? (
          <>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ border: "2px dashed var(--line-1)", borderRadius: 12, padding: "30px 20px", textAlign: "center", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "var(--ink-3)", transition: "border-color .15s", background: "var(--bg-subtle)" }}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--ink-1)"; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = "var(--line-1)"; }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--line-1)"; const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
            >
              <IcoUpload size={28} />
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-2)" }}>{t("dropZoneHint")}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{t("dropZoneTypes")}</div>
            </div>
            <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
          </>
        ) : (
          <>
            <div className="form-field">
              <label>{t("labelUrl")}</label>
              <input value={url} onChange={e => handleUrlChange(e.target.value)} placeholder="https://drive.google.com/..." autoFocus />
            </div>
            <div className="form-field">
              <label>{t("labelFileName")}</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder={t("placeholderFileName")} />
            </div>
            <div className="form-field">
              <label>{t("labelType")}</label>
              <select value={type} onChange={e => setType(e.target.value)}>
                {["pdf", "doc", "docx", "xls", "xlsx", "zip", "img", "mp4", "otro"].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Carpeta destino */}
        <div className="form-field">
          <label>{t("labelTargetFolder")}</label>
          <select value={selectedFolderId} onChange={e => setSelectedFolderId(e.target.value)}>
            <option value="">{t("noFolder")}</option>
            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        {mode === "link" && (
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--line-1)" }}>
            <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: "var(--bg-panel)", color: "var(--ink-2)", fontSize: 13, cursor: "pointer" }}>{t("cancel")}</button>
            <button onClick={handleSaveLink} disabled={!url.trim() || !name.trim() || saving} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "none", background: "var(--ink-1)", color: "white", fontSize: 13, fontWeight: 500, cursor: (url.trim() && name.trim()) ? "pointer" : "not-allowed", opacity: (!url.trim() || !name.trim()) ? 0.5 : 1 }}>
              {saving ? t("saving") : t("saveLink")}
            </button>
          </div>
        )}
        {mode === "upload" && saving && (
          <div style={{ textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>{t("uploadingFile")}</div>
        )}
      </div>
    </div>
  );
}

// ── New Folder Modal ──────────────────────────────────────────────────────────
function FolderModal({ initial, onSave, onClose }: { initial?: DocFolder | null; onSave: (data: { name: string; color: string }) => Promise<void>; onClose: () => void }) {
  const t = useTranslations("documents");
  const [name, setName] = useState(initial?.name || "");
  const [color, setColor] = useState(initial?.color || "#7FA890");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), color });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,0.35)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 360, background: "var(--bg-panel)", borderRadius: 14, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>{initial ? t("editFolder") : t("newFolder")}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4, borderRadius: 6, display: "flex" }}><IcoX /></button>
        </div>

        <div className="form-field">
          <label>{t("labelName")}</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t("placeholderFolderName")} autoFocus onKeyDown={e => e.key === "Enter" && handleSave()} />
        </div>

        <div className="form-field">
          <label>{t("labelColor")}</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FOLDER_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: color === c ? "3px solid var(--ink-1)" : "2px solid transparent", cursor: "pointer", outline: "none" }} />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--line-1)" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: "var(--bg-panel)", color: "var(--ink-2)", fontSize: 13, cursor: "pointer" }}>{t("cancel")}</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "none", background: "var(--ink-1)", color: "white", fontSize: 13, fontWeight: 500, cursor: name.trim() ? "pointer" : "not-allowed", opacity: !name.trim() ? 0.5 : 1 }}>
            {saving ? t("saving") : initial ? t("save") : t("createFolder")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN DOCUMENTS PAGE
// ════════════════════════════════════════════════════════════════════════════════
function DocumentsContent() {
  const t = useTranslations("documents");
  const [activeTab, setActiveTab] = useState<"archivos" | "plantillas" | "firma">("archivos");
  const [folders, setFolders] = useState<DocFolder[]>([]);
  const [docs, setDocs] = useState<OrgDoc[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editFolder, setEditFolder] = useState<DocFolder | null>(null);

  const activeFolder = folders.find(f => f.id === activeFolderId) || null;

  const fetchFolders = useCallback(async () => {
    const res = await fetch("/api/documents/folders");
    const data = await res.json();
    if (data.success) setFolders(data.data);
  }, []);

  const fetchDocs = useCallback(async (folderId: number | null) => {
    setLoading(true);
    try {
      const url = folderId ? `/api/documents?folderId=${folderId}` : "/api/documents";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setDocs(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    fetchDocs(activeFolderId);
  }, [fetchDocs, activeFolderId]);

  const handleUpload = async (docData: Partial<OrgDoc>) => {
    await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(docData),
    });
    toast.success(t("docAdded"));
    fetchFolders();
    fetchDocs(activeFolderId);
  };

  const handleDeleteDoc = async (id: number) => {
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    toast.success(t("docDeleted"));
    fetchFolders();
    fetchDocs(activeFolderId);
  };

  const handleSaveFolder = async (data: { name: string; color: string }) => {
    if (editFolder) {
      await fetch(`/api/documents/folders/${editFolder.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      toast.success(t("folderUpdated"));
    } else {
      await fetch("/api/documents/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      toast.success(t("folderCreated"));
    }
    setEditFolder(null);
    fetchFolders();
  };

  const handleDeleteFolder = async (id: number) => {
    await fetch(`/api/documents/folders/${id}`, { method: "DELETE" });
    toast.success(t("folderDeleted"));
    setActiveFolderId(null);
    fetchFolders();
    fetchDocs(null);
  };

  const filteredDocs = q.trim()
    ? docs.filter(d =>
        d.name.toLowerCase().includes(q.toLowerCase()) ||
        (d.fileType || "").toLowerCase().includes(q.toLowerCase())
      )
    : docs;

  const recentDocs = !activeFolderId ? docs.slice(0, 8) : [];

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>{t("pageTitle")}</h1>
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4, marginBottom: 0 }}>
            {t("pageSubtitle")}
          </p>
        </div>
        {activeTab === "archivos" && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setEditFolder(null); setFolderModalOpen(true); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "var(--bg-panel)", color: "var(--ink-2)", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", fontSize: 13, cursor: "pointer" }}>
              <IcoFolder size={14} /> {t("newFolder")}
            </button>
            <button onClick={() => setUploadOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--ink-1)", color: "white", border: "none", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              <IcoPlus size={13} /> {t("uploadFile")}
            </button>
          </div>
        )}
        {activeTab === "plantillas" && (
          <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--ink-1)", color: "white", border: "none", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            <IcoPlus size={13} /> {t("newTemplate")}
          </button>
        )}
        {activeTab === "firma" && (
          <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--ink-1)", color: "white", border: "none", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            <IcoSent size={13} /> {t("sendForSignature")}
          </button>
        )}
      </div>

      {/* Tab bar + search row */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        {/* Pill tabs */}
        <div style={{ display: "flex", gap: 4, background: "var(--bg-subtle)", borderRadius: "var(--r-sm)", padding: 3, flexShrink: 0 }}>
          {([
            { id: "archivos",   label: t("tabFiles"),           icon: <IcoFolder size={12} />,   n: docs.length },
            { id: "plantillas", label: t("tabTemplates"),        icon: <IcoTemplate size={12} />, n: 6 },
            { id: "firma",      label: t("tabSignaturePending"), icon: <IcoSign size={12} />,     n: 2 },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setActiveFolderId(null); setQ(""); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 13px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 12.5, fontWeight: activeTab === tab.id ? 600 : 500,
                background: activeTab === tab.id ? "white" : "transparent",
                color: activeTab === tab.id ? "var(--ink-1)" : "var(--ink-3)",
                boxShadow: activeTab === tab.id ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                transition: "background .12s, color .12s",
              }}
            >
              {tab.icon}
              {tab.label}
              <span style={{ fontSize: 11, color: activeTab === tab.id ? "var(--ink-3)" : "var(--ink-4)", background: activeTab === tab.id ? "var(--bg-subtle)" : "transparent", padding: "1px 6px", borderRadius: 999 }}>
                {tab.n}
              </span>
            </button>
          ))}
        </div>

        {/* Search — only on Archivos tab */}
        {activeTab === "archivos" && (
          <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", pointerEvents: "none", display: "flex" }}><IcoSearch /></span>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("searchPlaceholder")} style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", background: "var(--bg-panel)", fontSize: 13, color: "var(--ink-1)", outline: "none", boxSizing: "border-box" }} />
          </div>
        )}
      </div>

      {/* ── Tab: Archivos ── */}
      {activeTab === "archivos" && (
        <>
          {/* Breadcrumb */}
          {activeFolder && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 13, color: "var(--ink-2)" }}>
              <button onClick={() => setActiveFolderId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 13, display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
                <IcoBack size={13} /> {t("pageTitle")}
              </button>
              <span style={{ color: "var(--ink-4)" }}>/</span>
              <span style={{ fontWeight: 600, color: "var(--ink-1)" }}>{activeFolder.name}</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <button onClick={() => { setEditFolder(activeFolder); setFolderModalOpen(true); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: "var(--bg-panel)", color: "var(--ink-2)", fontSize: 12, cursor: "pointer" }}>
                  <IcoEdit /> {t("rename")}
                </button>
                <button onClick={() => handleDeleteFolder(activeFolder.id)} style={{ display: "flex", alignItems: "center", padding: "5px 8px", borderRadius: "var(--r-sm)", border: "none", background: "#FBEDEC", color: "#B55450", cursor: "pointer" }}>
                  <IcoTrash />
                </button>
              </div>
            </div>
          )}

          {/* Folders grid (only on root) */}
          {!activeFolderId && !q && (
            <>
              <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 10 }}>{t("sectionFolders")}</div>
              {folders.length === 0 ? (
                <div style={{ padding: "20px 0", marginBottom: 20, color: "var(--ink-4)", fontSize: 13 }}>
                  {t("noFolders")} <button onClick={() => { setEditFolder(null); setFolderModalOpen(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-2)", textDecoration: "underline", fontSize: 13, padding: 0 }}>{t("createFolder")}</button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
                  {folders.map(f => (
                    <div
                      key={f.id}
                      onClick={() => setActiveFolderId(f.id)}
                      style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: 10, padding: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "border-color .12s, background .12s", position: "relative" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = f.color || "var(--ink-3)"; e.currentTarget.style.background = "rgba(0,0,0,0.01)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line-1)"; e.currentTarget.style.background = "var(--bg-panel)"; }}
                    >
                      <FolderIcon color={f.color} size={38} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{f.fileCount} {f.fileCount === 1 ? t("fileSingular") : t("filePlural")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Documents grid */}
          <div>
            <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 10 }}>
              {activeFolder ? t("filesInFolder", { name: activeFolder.name }) : q ? t("searchResults") : t("sectionRecent")}
            </div>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-3)" }}>{t("loading")}</div>
            ) : filteredDocs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, opacity: 0.3 }}><IcoFile size={36} /></div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-2)", marginBottom: 6 }}>
                  {q ? t("noResults") : activeFolder ? t("emptyFolder") : t("noDocs")}
                </div>
                {!q && (
                  <button onClick={() => setUploadOpen(true)} style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "var(--ink-1)", color: "white", border: "none", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                    <IcoPlus size={13} /> {t("uploadFile")}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                {(q ? filteredDocs : activeFolderId ? filteredDocs : recentDocs).map(d => (
                  <div
                    key={d.id}
                    style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: 10, padding: 12, cursor: "pointer", display: "flex", flexDirection: "column", gap: 10, transition: "border-color .12s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ink-3)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line-1)"; }}
                  >
                    <FileTypeIcon type={d.fileType} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={d.name}>{d.name}</div>
                      <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 3, display: "flex", justifyContent: "space-between" }}>
                        <span>{fmtSize(d.fileSize)}</span>
                        <span>{timeAgo(d.createdAt, t)}</span>
                      </div>
                      {!activeFolderId && d.folderName && (
                        <div style={{ fontSize: 10.5, color: "var(--ink-4)", marginTop: 2 }}>📁 {d.folderName}</div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: "auto" }}>
                      {d.storageUrl && (
                        <a href={d.storageUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "5px 0", background: "var(--bg-subtle)", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", color: "var(--ink-2)", fontSize: 11, textDecoration: "none", cursor: "pointer" }}>
                          <IcoView /> {t("view")}
                        </a>
                      )}
                      <button onClick={e => { e.stopPropagation(); handleDeleteDoc(d.id); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5px 7px", borderRadius: "var(--r-sm)", border: "none", background: "#FBEDEC", color: "#B55450", cursor: "pointer" }}>
                        <IcoTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Tab: Plantillas ── */}
      {activeTab === "plantillas" && <PlantillasView />}

      {/* ── Tab: Firma pendiente ── */}
      {activeTab === "firma" && <FirmaView />}

      {/* Modals */}
      {uploadOpen && (
        <UploadModal
          folderId={activeFolderId}
          folders={folders}
          onClose={() => setUploadOpen(false)}
          onUpload={handleUpload}
        />
      )}
      {folderModalOpen && (
        <FolderModal
          initial={editFolder}
          onSave={handleSaveFolder}
          onClose={() => { setFolderModalOpen(false); setEditFolder(null); }}
        />
      )}
    </div>
  );
}

// ── Plantillas View ───────────────────────────────────────────────────────────
const TEMPLATES_DATA = [
  { id: 1, name: "Contrato boda — estándar",    category: "Contrato",   uses: 42, color: "#7FA890" },
  { id: 2, name: "Propuesta corporativo",        category: "Propuesta",  uses: 18, color: "#6B8CE8" },
  { id: 3, name: "Briefing cliente",             category: "Briefing",   uses: 31, color: "#E89C6B" },
  { id: 4, name: "Checklist día-D",              category: "Checklist",  uses: 56, color: "#A8845C" },
  { id: 5, name: "Ficha técnica catering",       category: "Ficha",      uses: 14, color: "#9B7EB8" },
  { id: 6, name: "Albarán de servicio",          category: "Financiero", uses:  9, color: "#B54632" },
];

function PlantillasView() {
  const t = useTranslations("documents");
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#FBF2E6", border: "1px solid #E8D9B8", borderRadius: "var(--r-sm)", marginBottom: 18, fontSize: 12, color: "var(--ink-2)" }}>
        <IcoTemplate size={13} />
        <span>{t("templatesBanner")}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {TEMPLATES_DATA.map(tpl => (
          <div
            key={tpl.id}
            style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: 12, padding: 16, cursor: "pointer", display: "flex", flexDirection: "column", gap: 12, transition: "border-color .12s, box-shadow .12s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = tpl.color; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line-1)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ width: 40, height: 40, background: tpl.color + "22", color: tpl.color, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IcoTemplate size={18} />
              </div>
              <span style={{ fontSize: 10.5, color: "var(--ink-3)", background: "var(--bg-subtle)", padding: "2px 8px", borderRadius: 999 }}>{tpl.category}</span>
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)" }}>{tpl.name}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 3 }}>{t("templateUsedTimes", { n: tpl.uses })}</div>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
              <button style={{ flex: 1, background: tpl.color, color: "white", border: "none", padding: "7px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>{t("useTemplate")}</button>
              <button style={{ background: "white", color: "var(--ink-2)", border: "1px solid var(--line-strong)", padding: "7px 10px", borderRadius: "var(--r-sm)", fontSize: 12, cursor: "pointer" }}>{t("preview")}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Firma View ────────────────────────────────────────────────────────────────
const SIGNATURES_DATA = [
  {
    id: 1, name: "Contrato — Cami y Juanca", event: "Cami y Juanca",
    sent: "19 abr", expires: "26 abr", status: "pending" as const,
    signers: [{ name: "Cami", status: "signed" as const }, { name: "Juanca", status: "pending" as const }],
  },
  {
    id: 2, name: "Contrato — Laura y Tomás", event: "Laura y Tomás",
    sent: "15 abr", expires: "22 abr", status: "completed" as const,
    signers: [{ name: "Laura", status: "signed" as const }, { name: "Tomás", status: "signed" as const }],
  },
  {
    id: 3, name: "Anexo menú — Martín & Claudia", event: "Martín & Claudia",
    sent: "17 abr", expires: "24 abr", status: "pending" as const,
    signers: [{ name: "Martín", status: "pending" as const }, { name: "Claudia", status: "pending" as const }],
  },
  {
    id: 4, name: "NDA — Grupo Sertex", event: "Grupo Sertex",
    sent: "10 abr", expires: "17 abr", status: "expired" as const,
    signers: [{ name: "Elena S.", status: "expired" as const }],
  },
];

const SIGNER_STYLE = {
  signed:  { bg: "#E4EEEA", fg: "#3F6B4D" },
  pending: { bg: "#F4EDE0", fg: "#8A6F3A" },
  expired: { bg: "#FCE4E0", fg: "#B54632" },
};
const STATUS_STYLE_BASE = {
  completed: { bg: "#E4EEEA", fg: "#3F6B4D" },
  pending:   { bg: "#F4EDE0", fg: "#8A6F3A" },
  expired:   { bg: "#FCE4E0", fg: "#B54632" },
};

function FirmaView() {
  const t = useTranslations("documents");
  const pending   = SIGNATURES_DATA.filter(s => s.status === "pending").length;
  const completed = SIGNATURES_DATA.filter(s => s.status === "completed").length;
  const expired   = SIGNATURES_DATA.filter(s => s.status === "expired").length;

  const STATUS_STYLE = {
    completed: { ...STATUS_STYLE_BASE.completed, label: t("statusSigned") },
    pending:   { ...STATUS_STYLE_BASE.pending,   label: t("statusPending") },
    expired:   { ...STATUS_STYLE_BASE.expired,   label: t("statusExpired") },
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#FBF2E6", border: "1px solid #E8D9B8", borderRadius: "var(--r-sm)", marginBottom: 18, fontSize: 12, color: "var(--ink-2)" }}>
        <IcoClock size={13} />
        <span>{t("signatureBanner")}</span>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 22 }}>
        {[
          { n: pending,   label: t("kpiPending"),   color: "#8A6F3A", bg: "#FBF2E6" },
          { n: completed, label: t("kpiSigned"),    color: "#3F6B4D", bg: "#E4EEEA" },
          { n: expired,   label: t("kpiExpired"),   color: "#B54632", bg: "#FCE4E0" },
        ].map((k, i) => (
          <div key={i} style={{ padding: 14, background: k.bg, borderRadius: 10, border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.n}</div>
            <div style={{ fontSize: 11, color: k.color, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".05em", marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 200px 90px 90px 110px 36px", background: "var(--bg-subtle)", padding: "10px 16px", fontSize: 10.5, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".05em", gap: 8 }}>
          <div>{t("colDocument")}</div>
          <div>{t("colEvent")}</div>
          <div>{t("colSigners")}</div>
          <div>{t("colSent")}</div>
          <div>{t("colExpires")}</div>
          <div>{t("colStatus")}</div>
          <div />
        </div>
        {SIGNATURES_DATA.map((s, idx) => {
          const st = STATUS_STYLE[s.status];
          return (
            <div
              key={s.id}
              style={{ display: "grid", gridTemplateColumns: "1fr 160px 200px 90px 90px 110px 36px", padding: "13px 16px", gap: 8, alignItems: "center", borderTop: idx === 0 ? "none" : "1px solid var(--line-1)", background: "white", cursor: "pointer", transition: "background .1s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-subtle)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "white"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <IcoFile size={14} />
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
              </div>
              <div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#FBF2E6", color: "#A65B1E", padding: "3px 8px", borderRadius: 999, fontSize: 11, border: "1px solid #E8D9B8", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.event}
                </span>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {s.signers.map((sg, i) => {
                  const ss = SIGNER_STYLE[sg.status];
                  return (
                    <span key={i} style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 999, background: ss.bg, color: ss.fg, display: "inline-flex", alignItems: "center", gap: 3 }}>
                      {sg.status === "signed" && <IcoSign size={9} />}
                      {sg.name}
                    </span>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{s.sent}</div>
              <div style={{ fontSize: 12, color: s.status === "expired" ? "#B54632" : "var(--ink-2)", fontWeight: s.status === "expired" ? 600 : 400 }}>{s.expires}</div>
              <div>
                <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 10.5, fontWeight: 500, background: st.bg, color: st.fg }}>
                  {st.label}
                </span>
              </div>
              <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", display: "flex", alignItems: "center", justifyContent: "center", padding: 4, borderRadius: 4 }}>
                ···
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <EventScopedGuard>
      <DocumentsContent />
    </EventScopedGuard>
  );
}
