"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RiGlobeLine,
  RiSurveyLine,
  RiLoader4Line,
  RiFileCopyLine,
  RiExternalLinkLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiDownloadLine,
} from "@remixicon/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

interface TaskFormInstance {
  id: number;
  formId: number;
  formName?: string;
  type: string;
  slug: string | null;
  status: string;
  submissionCount: number;
}

interface Submission {
  id: number;
  respondentName: string | null;
  respondentEmail: string | null;
  createdAt: string;
}

export function TaskFormsTab({ taskId }: { taskId: number }) {
  const pathname = usePathname();
  const formsBasePath = "/dashboard/forms";
  const [forms, setForms] = useState<TaskFormInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<Record<number, Submission[]>>({});
  const [loadingSubs, setLoadingSubs] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/tasks/${taskId}/forms`);
        const data = await res.json();
        if (data.success) {
          setForms(data.data || []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [taskId]);

  const toggleExpand = async (instanceId: number, formId: number) => {
    if (expandedId === instanceId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(instanceId);
    if (!submissions[instanceId]) {
      setLoadingSubs(instanceId);
      try {
        const res = await fetch(`/api/forms/${formId}/submissions?limit=20`);
        const data = await res.json();
        if (data.success) {
          setSubmissions((prev) => ({ ...prev, [instanceId]: data.data || [] }));
        }
      } catch { /* silent */ }
      finally { setLoadingSubs(null); }
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado al portapapeles");
  };

  const downloadPdf = async (formId: number, subId: number, name: string) => {
    try {
      const { downloadPDFFromHTML } = await import("@/lib/pdf-download");
      await downloadPDFFromHTML(
        `/api/forms/${formId}/submissions/${subId}/pdf?format=html`,
        `${name}.pdf`
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

  if (forms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <RiSurveyLine className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <h3 className="text-base font-medium">Sin formularios</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Vincula formularios a esta tarea desde el editor de formularios (Formularios → Configuración → Instancias).
        </p>
        <Link href={formsBasePath} className="mt-4">
          <Button variant="outline" size="sm" className="gap-2">
            <RiExternalLinkLine className="h-3.5 w-3.5" />
            Ir a Formularios
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{forms.length} formulario{forms.length !== 1 ? "s" : ""} vinculado{forms.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="space-y-2">
        {forms.map((fi) => (
          <div key={fi.id} className="rounded-lg border overflow-hidden">
            <div
              className="flex items-center justify-between p-3 group cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => toggleExpand(fi.id, fi.formId)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="text-xs shrink-0">
                  {fi.type === "landing" ? (
                    <><RiGlobeLine className="h-3 w-3 mr-1" />Landing</>
                  ) : (
                    <><RiSurveyLine className="h-3 w-3 mr-1" />Tarea</>
                  )}
                </Badge>
                <Link
                  href={`/dashboard/forms/${fi.formId}`}
                  className="font-medium text-sm text-primary hover:underline truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {fi.formName || `Formulario #${fi.formId}`}
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{fi.submissionCount} resp.</span>
                {fi.slug && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); copyLink(fi.slug!); }}
                    title="Copiar link público"
                  >
                    <RiFileCopyLine className="h-3.5 w-3.5" />
                  </Button>
                )}
                {expandedId === fi.id ? (
                  <RiArrowUpSLine className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <RiArrowDownSLine className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {expandedId === fi.id && (
              <div className="border-t bg-muted/10 px-3 py-2">
                {loadingSubs === fi.id ? (
                  <div className="flex items-center justify-center py-4">
                    <RiLoader4Line className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (submissions[fi.id] || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Sin respuestas aún</p>
                ) : (
                  <div className="space-y-1">
                    {(submissions[fi.id] || []).map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between py-1.5 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">{sub.respondentName || "Anónimo"}</span>
                          {sub.respondentEmail && (
                            <span className="text-xs text-muted-foreground truncate">{sub.respondentEmail}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {new Date(sub.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => downloadPdf(fi.formId, sub.id, `Respuesta_${sub.id}`)}
                            title="Descargar PDF"
                          >
                            <RiDownloadLine className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
