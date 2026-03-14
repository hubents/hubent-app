"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  RiSurveyLine,
  RiAddLine,
  RiSearchLine,
  RiEditLine,
  RiFileCopyLine,
  RiDeleteBinLine,
  RiLink,
  RiTaskLine,
  RiMoreLine,
  RiFileList2Line,
  RiGlobeLine,
  RiDownloadLine,
  RiLoader4Line,
  RiExternalLinkLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { useUserSession } from "@/hooks/use-user-session";
import { ShareFormDialog } from "@/components/forms/share-form-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface FormItem {
  id: number;
  name: string;
  description: string | null;
  status: string;
  fieldCount: number;
  instanceCount: number;
  submissionCount: number;
  landingSlug: string | null;
  createdAt: string;
  updatedAt: string;
}

type FilterTab = "all" | "active" | "draft" | "paused";
type ViewMode = "forms" | "responses";

export default function FormsPage() {
  return <EventScopedGuard><FormsPageContent /></EventScopedGuard>;
}

function FormsPageContent() {
  const router = useRouter();
  const { can, loading: sessionLoading } = useUserSession();
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("forms");
  const [shareSlug, setShareSlug] = useState<string | null>(null);

  const canCreate = sessionLoading ? true : can("forms:create");
  const canUpdate = sessionLoading ? true : can("forms:update");
  const canDelete = sessionLoading ? true : can("forms:delete");

  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch("/api/forms");
      const data = await res.json();
      if (data.success) setForms(data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchForms();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchForms]);

  const filteredForms = forms.filter((f) => {
    if (filter !== "all" && f.status !== filter) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Nuevo formulario" }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/dashboard/forms/${data.data.id}`);
      }
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (formId: number) => {
    try {
      const res = await fetch(`/api/forms/${formId}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        fetchForms();
      }
    } catch {
      // silent
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/forms/${deleteId}`, { method: "DELETE" });
      setForms((prev) => prev.filter((f) => f.id !== deleteId));
    } catch {
      // silent
    } finally {
      setDeleteId(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Activo</Badge>;
      case "draft":
        return <Badge variant="secondary">Borrador</Badge>;
      case "paused":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Pausado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const tabs: { label: string; value: FilterTab }[] = [
    { label: "Todos", value: "all" },
    { label: "Activos", value: "active" },
    { label: "Borradores", value: "draft" },
    { label: "Pausados", value: "paused" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Formularios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crea formularios para captar leads o recopilar información de tareas
          </p>
        </div>
        {canCreate && (
          <Button onClick={handleCreate} disabled={creating}>
            <RiAddLine className="h-4 w-4 mr-2" />
            {creating ? "Creando..." : "Nuevo formulario"}
          </Button>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setViewMode("forms")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              viewMode === "forms" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <RiSurveyLine className="h-3.5 w-3.5" /> Formularios
          </button>
          <button
            onClick={() => setViewMode("responses")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              viewMode === "responses" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <RiFileList2Line className="h-3.5 w-3.5" /> Respuestas
          </button>
        </div>
      </div>

      {viewMode === "responses" ? (
        <AllSubmissionsView />
      ) : (
      <>
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === tab.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar formularios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Forms Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <RiSurveyLine className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">
            {forms.length === 0 ? "Sin formularios" : "Sin resultados"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            {forms.length === 0
              ? "Crea tu primer formulario para captar leads o recopilar información de tus clientes."
              : "Intenta con otros filtros o términos de búsqueda."}
          </p>
          {forms.length === 0 && canCreate && (
            <Button onClick={handleCreate} className="mt-4" disabled={creating}>
              <RiAddLine className="h-4 w-4 mr-2" />
              Crear formulario
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredForms.map((form) => (
            <div
              key={form.id}
              className="group relative rounded-xl border bg-card p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/forms/${form.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">{form.name}</h3>
                  {form.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {form.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {statusBadge(form.status)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <RiMoreLine className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/forms/${form.id}`)}>
                        <RiEditLine className="h-4 w-4 mr-2" />
                        {canUpdate ? "Editar" : "Ver"}
                      </DropdownMenuItem>
                      {canCreate && (
                        <DropdownMenuItem onClick={() => handleDuplicate(form.id)}>
                          <RiFileCopyLine className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(form.id)}
                        >
                          <RiDeleteBinLine className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                {form.landingSlug && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareSlug(form.landingSlug);
                    }}
                    className="flex items-center gap-1 text-primary hover:underline"
                    title="Compartir formulario"
                  >
                    <RiGlobeLine className="h-3.5 w-3.5" />
                    Compartir
                  </button>
                )}
                {form.instanceCount > 0 && (
                  <span className="flex items-center gap-1">
                    <RiTaskLine className="h-3.5 w-3.5" />
                    {form.instanceCount} {form.instanceCount === 1 ? "instancia" : "instancias"}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <RiSurveyLine className="h-3.5 w-3.5" />
                  {form.submissionCount} {form.submissionCount === 1 ? "respuesta" : "respuestas"}
                </span>
                <span className="flex items-center gap-1">
                  {form.fieldCount} campos
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar formulario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todas las instancias y respuestas asociadas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
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

interface OrgSubmission {
  id: number;
  formId: number;
  instanceId: number;
  respondentName: string | null;
  respondentEmail: string | null;
  createdAt: string;
  formName: string;
  instanceType: string;
  instanceSlug: string | null;
}

type ResponseFilter = "all" | "landing" | "task";

function AllSubmissionsView() {
  const [subs, setSubs] = useState<OrgSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<ResponseFilter>("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/forms/submissions?limit=50");
        const data = await res.json();
        if (data.success) {
          setSubs(data.data || []);
          setTotal(data.meta?.total ?? 0);
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filteredSubs = typeFilter === "all"
    ? subs
    : subs.filter((s) => s.instanceType === typeFilter);

  const downloadPdf = async (formId: number, subId: number) => {
    try {
      const { downloadPDFFromHTML } = await import("@/lib/pdf-download");
      await downloadPDFFromHTML(
        `/api/forms/${formId}/submissions/${subId}/pdf?format=html`,
        `Respuesta_${subId}.pdf`
      );
    } catch {
      toast.error("Error al descargar PDF");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (subs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <RiFileList2Line className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">Sin respuestas</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Las respuestas aparecerán aquí cuando alguien envíe un formulario.
        </p>
      </div>
    );
  }

  const responseFilterTabs: { label: string; value: ResponseFilter; icon: typeof RiGlobeLine }[] = [
    { label: "Todas", value: "all", icon: RiFileList2Line },
    { label: "Landing", value: "landing", icon: RiGlobeLine },
    { label: "Tareas", value: "task", icon: RiTaskLine },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {responseFilterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                typeFilter === tab.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" /> {tab.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{filteredSubs.length} de {total} respuestas</p>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Formulario</th>
              <th className="text-left px-4 py-2 font-medium">Tipo</th>
              <th className="text-left px-4 py-2 font-medium">Nombre</th>
              <th className="text-left px-4 py-2 font-medium">Email</th>
              <th className="text-left px-4 py-2 font-medium">Fecha</th>
              <th className="text-left px-4 py-2 font-medium">PDF</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubs.map((sub) => (
              <tr key={sub.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2">
                  <a href={`/dashboard/forms/${sub.formId}`} className="text-primary hover:underline font-medium">
                    {sub.formName}
                  </a>
                </td>
                <td className="px-4 py-2">
                  <Badge variant="outline" className="text-xs">
                    {sub.instanceType === "landing" ? (
                      <><RiGlobeLine className="h-3 w-3 mr-1" />Landing</>
                    ) : (
                      <><RiTaskLine className="h-3 w-3 mr-1" />Tarea</>
                    )}
                  </Badge>
                </td>
                <td className="px-4 py-2">{sub.respondentName || "—"}</td>
                <td className="px-4 py-2">{sub.respondentEmail || "—"}</td>
                <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                  {new Date(sub.createdAt).toLocaleDateString("es-AR", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => downloadPdf(sub.formId, sub.id)}
                    title="Descargar PDF"
                  >
                    <RiDownloadLine className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
