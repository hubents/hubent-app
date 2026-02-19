"use client";

import { Sparkles, MessageSquare, Zap, FileText, Calendar, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AIChatBase } from "@/components/ai/ai-chat-base";

const features = [
  {
    icon: Calendar,
    title: "Gestión de Eventos",
    description: "Pregunta sobre tus eventos, fechas, proveedores y más",
  },
  {
    icon: FileText,
    title: "Tareas Inteligentes",
    description: "Obtén resúmenes, genera subtareas y gestiona pendientes",
  },
  {
    icon: Users,
    title: "CRM y Contactos",
    description: "Consulta leads, contactos y oportunidades de venta",
  },
  {
    icon: Zap,
    title: "Acciones Rápidas",
    description: "Crea eventos, tareas y más con comandos naturales",
  },
];

export default function AIPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Enti - Asistente IA</h1>
          <p className="text-muted-foreground">
            Tu asistente inteligente para gestionar HubEnts {/* HIDDEN TEMPORARILY: • by NapsixAI */}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Panel - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Card className="h-[calc(100vh-12rem)] min-h-[500px] flex flex-col">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-violet-500" />
                <CardTitle className="text-lg">Chat con Enti</CardTitle>
              </div>
              <CardDescription>
                Pregunta lo que necesites sobre tu organización
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <AIChatBase
                context="dashboard"
                showHeader={false}
                className="h-full"
              />
            </CardContent>
          </Card>
        </div>

        {/* Features Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">¿Qué puedo hacer?</CardTitle>
              <CardDescription>
                Enti puede ayudarte con muchas tareas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {features.map((feature, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acceso Rápido</CardTitle>
              <CardDescription>
                También puedes acceder a Enti desde:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                <span>El botón <Sparkles className="w-4 h-4 inline text-violet-500" /> en el header</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                <span>El botón "Enti" dentro de cada tarea</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                <span>Próximamente: atajos de teclado</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
