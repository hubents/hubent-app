"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  FileText, 
  Search, 
  Edit, 
  Trash2, 
  Loader2,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface AIDocument {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[] | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

const categories = [
  { value: "faq", label: "FAQ" },
  { value: "tutorial", label: "Tutorial" },
  { value: "feature", label: "Funcionalidad" },
  { value: "policy", label: "Política" },
  { value: "general", label: "General" },
];

export default function AdminAIDocumentsPage() {
  const [documents, setDocuments] = useState<AIDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<AIDocument | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "general",
    tags: "",
    priority: 0,
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    try {
      const res = await fetch("/api/admin/ai/documents");
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      toast.error("Error al cargar documentos");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form.title || !form.content) {
      toast.error("Título y contenido son requeridos");
      return;
    }

    setSaving(true);
    try {
      const method = editingDoc ? "PUT" : "POST";
      const body = {
        ...form,
        id: editingDoc?.id,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      };

      const res = await fetch("/api/admin/ai/documents", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(editingDoc ? "Documento actualizado" : "Documento creado");
        setIsDialogOpen(false);
        resetForm();
        loadDocuments();
      } else {
        toast.error(data.error || "Error al guardar");
      }
    } catch (error) {
      toast.error("Error al guardar documento");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este documento?")) return;

    try {
      const res = await fetch(`/api/admin/ai/documents?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Documento eliminado");
        loadDocuments();
      }
    } catch (error) {
      toast.error("Error al eliminar");
    }
  }

  function resetForm() {
    setForm({ title: "", content: "", category: "general", tags: "", priority: 0 });
    setEditingDoc(null);
  }

  function openEdit(doc: AIDocument) {
    setEditingDoc(doc);
    setForm({
      title: doc.title,
      content: doc.content,
      category: doc.category,
      tags: doc.tags?.join(", ") || "",
      priority: doc.priority,
    });
    setIsDialogOpen(true);
  }

  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(search.toLowerCase()) ||
    doc.content.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      faq: "bg-blue-500/10 text-blue-600",
      tutorial: "bg-green-500/10 text-green-600",
      feature: "bg-purple-500/10 text-purple-600",
      policy: "bg-orange-500/10 text-orange-600",
      general: "bg-slate-500/10 text-slate-600",
    };
    return colors[cat] || colors.general;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/ai">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Documentación IA</h1>
          <p className="text-muted-foreground">
            Contenido que Enti usa para responder preguntas de soporte
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingDoc ? "Editar Documento" : "Nuevo Documento"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Ej: ¿Cómo crear un evento?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Contenido</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Escribe el contenido que Enti usará para responder..."
                  rows={8}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tags (separados por coma)</Label>
                  <Input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="evento, crear, nuevo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prioridad (mayor = más relevante)</Label>
                  <Input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingDoc ? "Guardar Cambios" : "Crear Documento"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar documentos..."
          className="pl-10"
        />
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {search ? "No se encontraron documentos" : "No hay documentos aún"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Agrega documentación para que Enti pueda responder preguntas de soporte
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDocs.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{doc.title}</h3>
                      <Badge className={getCategoryColor(doc.category)}>
                        {categories.find(c => c.value === doc.category)?.label || doc.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {doc.content}
                    </p>
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {doc.tags.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(doc)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
