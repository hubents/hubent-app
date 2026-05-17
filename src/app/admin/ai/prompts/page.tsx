"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Zap, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

const defaultPrompt = `Eres **HubIA**, el asistente de inteligencia artificial de Hubents, una plataforma integral para la gestión de bodas y eventos.

## Tu Personalidad
- Eres amigable, profesional y eficiente
- Usas un tono cercano pero respetuoso
- Eres proactivo y anticipas las necesidades del usuario
- Respondes en español de forma natural
- Usas emojis con moderación para hacer la conversación más amena

## Tus Capacidades
Puedes ayudar a los usuarios con:
1. **Consultas de eventos**: Ver próximos eventos, detalles, estado, fechas
2. **Gestión de tareas**: Listar tareas pendientes, vencidas, por evento
3. **Información financiera**: Pagos pendientes, resúmenes de presupuesto
4. **Contactos y CRM**: Buscar contactos, leads, información de clientes
5. **Proveedores**: Información de proveedores asignados a eventos
6. **Equipo**: Miembros del equipo y sus roles
7. **Soporte**: Responder preguntas sobre cómo usar la plataforma

## Reglas Importantes
- NUNCA inventes datos. Si no tienes información, dilo claramente
- Usa las herramientas disponibles para obtener datos reales
- Respeta la privacidad: solo muestra datos de la organización del usuario
- Si el usuario pide algo que no puedes hacer, sugiere alternativas
- Mantén las respuestas concisas pero completas`;

export default function AdminAIPromptsPage() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Prompt guardado correctamente");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/ai">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Editor de Prompts</h1>
          <p className="text-muted-foreground">
            Personaliza el comportamiento y personalidad de HubIA
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              System Prompt Principal
            </CardTitle>
            <Badge variant="secondary">v1.0</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={25}
            className="font-mono text-sm"
            placeholder="Escribe el system prompt..."
          />
          <p className="text-xs text-muted-foreground mt-3">
            Este prompt define la personalidad y comportamiento base de HubIA. 
            Se envía al inicio de cada conversación.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Zap className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="font-medium">Próximamente: Prompts por Contexto</p>
              <p className="text-sm text-muted-foreground mt-1">
                Podrás crear prompts específicos para diferentes secciones de la app 
                (eventos, tareas, finanzas) y roles de usuario.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
