"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Bot, 
  Zap, 
  Shield, 
  Save,
  Loader2,
  Info
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const models = [
  // Google
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "Rápido y eficiente", provider: "Google" },
  { id: "google/gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "Balance velocidad/calidad", provider: "Google" },
  { id: "google/gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Mayor capacidad", provider: "Google" },
  // OpenAI
  { id: "openai/gpt-4o", name: "GPT-4o", description: "Multimodal avanzado", provider: "OpenAI" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", description: "Rápido y económico", provider: "OpenAI" },
  // Anthropic
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", description: "Excelente razonamiento", provider: "Anthropic" },
  // Meta
  { id: "meta/llama-3.3-70b", name: "Llama 3.3 70B", description: "Open source potente", provider: "Meta" },
];

export default function AdminAISettingsPage() {
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    model: "google/gemini-2.0-flash",
    temperature: 0.7,
    maxTokens: 2048,
    enabled: true,
    enabledForAllPlans: true,
    rateLimitPerHour: 50,
    assistantName: "Enti",
    welcomeMessage: "¡Hola! Soy Enti, tu asistente inteligente. ¿En qué puedo ayudarte hoy?",
  });

  async function handleSave() {
    setSaving(true);
    try {
      // Simular guardado - en producción esto iría a la API
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Configuración guardada");
    } catch (error) {
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
          <h1 className="text-2xl font-bold">Configuración de IA</h1>
          <p className="text-muted-foreground">
            Ajusta el comportamiento del asistente Enti
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar Cambios
        </Button>
      </div>

      <div className="space-y-6">
        {/* Estado General */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Estado General
                </CardTitle>
                <CardDescription>
                  Controla si el asistente está activo para los usuarios
                </CardDescription>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-3 border-t">
              <div>
                <p className="font-medium">Disponible para todos los planes</p>
                <p className="text-sm text-muted-foreground">
                  Si está desactivado, solo planes premium tendrán acceso
                </p>
              </div>
              <Switch
                checked={config.enabledForAllPlans}
                onCheckedChange={(checked) => setConfig({ ...config, enabledForAllPlans: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Modelo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Modelo de IA
            </CardTitle>
            <CardDescription>
              Selecciona el modelo de Google Gemini a utilizar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select
                value={config.model}
                onValueChange={(v) => setConfig({ ...config, model: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        <span className="text-xs text-muted-foreground">
                          - {model.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Gemini 2.0 Flash (Recomendado)</p>
                <p className="text-muted-foreground">
                  Optimizado para respuestas rápidas con excelente calidad. 
                  Costo aproximado: $0.10/1M tokens input, $0.40/1M tokens output.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parámetros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Parámetros del Modelo
            </CardTitle>
            <CardDescription>
              Ajusta cómo responde el asistente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Temperatura: {config.temperature}</Label>
                <Badge variant="outline">
                  {config.temperature < 0.3 ? "Preciso" : config.temperature < 0.7 ? "Balanceado" : "Creativo"}
                </Badge>
              </div>
              <Slider
                value={[config.temperature]}
                onValueChange={([v]) => setConfig({ ...config, temperature: v })}
                min={0}
                max={1}
                step={0.1}
              />
              <p className="text-xs text-muted-foreground">
                Menor = respuestas más consistentes. Mayor = respuestas más variadas y creativas.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Máximo de tokens por respuesta</Label>
              <Input
                type="number"
                value={config.maxTokens}
                onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) || 2048 })}
                min={256}
                max={8192}
              />
              <p className="text-xs text-muted-foreground">
                Limita la longitud de las respuestas. 2048 tokens ≈ 1500 palabras.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Límite de mensajes por usuario/hora</Label>
              <Input
                type="number"
                value={config.rateLimitPerHour}
                onChange={(e) => setConfig({ ...config, rateLimitPerHour: parseInt(e.target.value) || 50 })}
                min={10}
                max={200}
              />
              <p className="text-xs text-muted-foreground">
                Previene abuso y controla costos. 0 = sin límite.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Personalización */}
        <Card>
          <CardHeader>
            <CardTitle>Personalización</CardTitle>
            <CardDescription>
              Personaliza la identidad del asistente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del asistente</Label>
              <Input
                value={config.assistantName}
                onChange={(e) => setConfig({ ...config, assistantName: e.target.value })}
                placeholder="Enti"
              />
            </div>

            <div className="space-y-2">
              <Label>Mensaje de bienvenida</Label>
              <Input
                value={config.welcomeMessage}
                onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                placeholder="¡Hola! ¿En qué puedo ayudarte?"
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Gateway Info */}
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-700">Vercel AI Gateway</p>
                <p className="text-sm text-green-600 mt-1">
                  Usando Vercel AI Gateway con autenticación OIDC automática. 
                  No requiere API keys individuales por proveedor.
                </p>
                <p className="text-xs text-green-600/80 mt-2">
                  Acceso a +100 modelos de Google, OpenAI, Anthropic, Meta y más.
                  Analytics y caching incluidos en el dashboard de Vercel.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
