"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Calendar, 
  Users, 
  CreditCard, 
  Settings, 
  Bell, 
  Search,
  Plus,
  Heart,
  Star,
  Trash2,
  Edit,
  Share2,
  Download,
  Upload,
  Check,
  X,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedCard } from "@/components/ui/animated-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { AnimatedModal } from "@/components/ui/animated-modal";
import { IconButton } from "@/components/ui/icon-button";

export default function DemoPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [likes, setLikes] = useState(42);

  return (
    <div className="min-h-screen bg-[var(--background)] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            Lucide + Framer Motion
          </Badge>
          <h1 className="text-4xl font-bold mb-2">Demo de Animaciones</h1>
          <p className="text-[var(--muted-foreground)]">
            Componentes con Lucide Icons y Framer Motion integrados
          </p>
        </motion.div>

        {/* Animated Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { icon: Calendar, label: "Eventos", value: 156, color: "primary" },
            { icon: Users, label: "Clientes", value: 2847, color: "success" },
            { icon: CreditCard, label: "Ingresos", value: 48500, prefix: "$", color: "warning" },
            { icon: Star, label: "Rating", value: 49, suffix: "/5", color: "info" },
          ].map((stat, index) => (
            <AnimatedCard key={stat.label} delay={index * 0.1}>
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-full bg-[var(--${stat.color})]/10 flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 text-[var(--${stat.color})]`} />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">{stat.label}</p>
                  <p className="text-2xl font-bold">
                    <AnimatedCounter 
                      value={stat.value} 
                      prefix={stat.prefix} 
                      suffix={stat.suffix}
                    />
                  </p>
                </div>
              </div>
            </AnimatedCard>
          ))}
        </div>

        {/* Icon Buttons Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[var(--primary)]" />
              Icon Buttons con Animación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <IconButton icon={Heart} variant="danger" onClick={() => setLikes(l => l + 1)} />
              <IconButton icon={Star} variant="warning" />
              <IconButton icon={Plus} variant="primary" />
              <IconButton icon={Edit} variant="default" />
              <IconButton icon={Trash2} variant="danger" />
              <IconButton icon={Share2} variant="success" />
              <IconButton icon={Download} variant="primary" />
              <IconButton icon={Upload} variant="warning" />
              <IconButton icon={Check} variant="success" />
              <IconButton icon={X} variant="danger" />
            </div>
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">
              Likes: <AnimatedCounter value={likes} /> (haz click en el corazón)
            </p>
          </CardContent>
        </Card>

        {/* Animated Cards Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Boda García-López", date: "15 Mar 2024", guests: 150, progress: 78 },
            { title: "Cumpleaños Ana", date: "22 Mar 2024", guests: 50, progress: 45 },
            { title: "Evento Corporativo", date: "1 Abr 2024", guests: 200, progress: 92 },
          ].map((event, index) => (
            <AnimatedCard key={event.title} delay={index * 0.15}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold">{event.title}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">{event.date}</p>
                </div>
                <Badge variant={event.progress > 80 ? "success" : event.progress > 50 ? "warning" : "secondary"}>
                  {event.progress}%
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {event.guests} invitados
                </span>
                <Button variant="ghost" size="sm" className="gap-1">
                  Ver <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </AnimatedCard>
          ))}
        </div>

        {/* Modal Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Modal Animado</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Abrir Modal Animado
            </Button>
          </CardContent>
        </Card>

        <AnimatedModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Modal con Framer Motion"
          description="Este modal tiene animaciones suaves de entrada y salida."
        >
          <div className="space-y-4">
            <p className="text-[var(--muted-foreground)]">
              Este es un ejemplo de modal animado usando Framer Motion.
              Incluye animaciones de scale, opacity y spring physics.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setIsModalOpen(false)}>
                Confirmar
              </Button>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </AnimatedModal>

        {/* Navigation Quick Actions */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center gap-4"
        >
          <a href="/components">
            <Button variant="outline" className="gap-2">
              Ver Componentes <ArrowUpRight className="h-4 w-4" />
            </Button>
          </a>
          <a href="/dashboard">
            <Button variant="outline" className="gap-2">
              Ir al Dashboard <ArrowUpRight className="h-4 w-4" />
            </Button>
          </a>
        </motion.div>
      </div>
    </div>
  );
}
