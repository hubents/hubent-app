"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup } from "@/components/ui/radio";
import { Alert } from "@/components/ui/alert";
import { Tabs } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { Select } from "@/components/ui/select";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/modal";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Popover } from "@/components/ui/popover";
import { Divider } from "@/components/ui/divider";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Kbd } from "@/components/ui/kbd";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { Tag } from "@/components/ui/tag";
import { EmptyState } from "@/components/ui/empty-state";
import { Accordion } from "@/components/ui/accordion";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Calendar } from "@/components/ui/calendar";
import { Drawer } from "@/components/ui/drawer";
import { FileUpload } from "@/components/ui/file-upload";
import { Table } from "@/components/ui/table";
import { Rating } from "@/components/ui/rating";
import { Notification } from "@/components/ui/notification";
import { ProfileCard } from "@/components/ui/profile-card";
import { CommandMenu } from "@/components/ui/command-menu";
import {
  RiSunLine,
  RiMoonLine,
  RiPaletteLine,
  RiCheckLine,
  RiCloseLine,
  RiArrowRightLine,
  RiDownloadLine,
  RiHeartLine,
  RiStarLine,
  RiRefreshLine,
  RiMoreLine,
  RiEditLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiInboxLine,
  RiSettings3Line,
  RiUserLine,
  RiLogoutBoxLine,
  RiSearchLine,
} from "@remixicon/react";

export default function ComponentsPage() {
  const [isDark, setIsDark] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#1963EF");
  const [accentColor, setAccentColor] = useState("#5C6972");
  const [switchValue, setSwitchValue] = useState(true);
  const [checkboxValue, setCheckboxValue] = useState(true);
  const [radioValue, setRadioValue] = useState("option1");
  const [selectValue, setSelectValue] = useState("");
  const [progressValue, setProgressValue] = useState(65);
  const [sliderValue, setSliderValue] = useState(50);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [ratingValue, setRatingValue] = useState(4);

  useEffect(() => {
    document.documentElement.style.setProperty("--primary", primaryColor);
    // primary-hover removed in new design system
  }, [primaryColor]);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accentColor);
  }, [accentColor]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  function adjustColor(color: string, amount: number): string {
    const hex = color.replace("#", "");
    const num = parseInt(hex, 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  }

  const triggerAnimation = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  const presetColors = [
    { name: "HubEnts Blue", primary: "#1963EF", accent: "#5C6972" },
    { name: "Emerald", primary: "#10B981", accent: "#6B7280" },
    { name: "Purple", primary: "#8B5CF6", accent: "#64748B" },
    { name: "Rose", primary: "#F43F5E", accent: "#71717A" },
    { name: "Orange", primary: "#F97316", accent: "#78716C" },
    { name: "Teal", primary: "#14B8A6", accent: "#64748B" },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--card)]/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Image src="/images/icon.png" alt="HubEnts" width={32} height={32} className="rounded-lg" />
            <span className="text-xl font-bold">Component Library</span>
            <Badge variant="secondary">AlignUI Inspired</Badge>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="success" className="animate-pulse">95% AlignUI</Badge>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className="transition-all hover:scale-110 hover:rotate-12"
            >
              {isDark ? <RiSunLine className="h-4 w-4" /> : <RiMoonLine className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Color Editor Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RiPaletteLine className="h-5 w-5" />
                    Editor de Colores
                  </CardTitle>
                  <CardDescription>
                    Personaliza los colores en tiempo real
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Primary Color */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Color Primario</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded-[var(--radius)] border border-[var(--border)]"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Color Secundario</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded-[var(--radius)] border border-[var(--border)]"
                      />
                      <Input
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>

                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Modo Oscuro</span>
                    <Switch checked={isDark} onCheckedChange={setIsDark} />
                  </div>

                  {/* Presets */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Presets</label>
                    <div className="grid grid-cols-3 gap-2">
                      {presetColors.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => {
                            setPrimaryColor(preset.primary);
                            setAccentColor(preset.accent);
                          }}
                          className="group relative h-8 rounded-[var(--radius)] transition-transform hover:scale-105"
                          style={{ backgroundColor: preset.primary }}
                          title={preset.name}
                        >
                          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <RiCheckLine className="h-4 w-4 text-white" />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Preview */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Preview</label>
                    <div className="flex gap-2">
                      <div
                        className="h-12 flex-1 rounded-[var(--radius)] flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Primary
                      </div>
                      <div
                        className="h-12 flex-1 rounded-[var(--radius)] flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: accentColor }}
                      >
                        Accent
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Components Showcase */}
          <main className="lg:col-span-3 space-y-8">
            {/* Typography */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Tipografía</h2>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h1 className="text-4xl font-bold">Heading 1 - DM Sans Bold</h1>
                  <h2 className="text-3xl font-semibold">Heading 2 - DM Sans Semibold</h2>
                  <h3 className="text-2xl font-medium">Heading 3 - DM Sans Medium</h3>
                  <h4 className="text-xl font-medium">Heading 4 - DM Sans Medium</h4>
                  <p className="text-base">
                    Párrafo base - Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Texto secundario - Ut enim ad minim veniam, quis nostrud exercitation.
                  </p>
                  <a href="#" className="text-[var(--primary)] hover:underline">
                    Link de ejemplo →
                  </a>
                </CardContent>
              </Card>
            </section>

            {/* Buttons */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Botones</h2>
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-[var(--muted-foreground)] mb-3">Variantes</h3>
                    <div className="flex flex-wrap gap-3">
                      <Button>Default</Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="outline">Outline</Button>
                      <Button variant="ghost">Ghost</Button>
                      <Button variant="destructive">Destructive</Button>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[var(--muted-foreground)] mb-3">Tamaños</h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button size="sm">Small</Button>
                      <Button size="default">Default</Button>
                      <Button size="lg">Large</Button>
                      <Button size="icon"><RiHeartLine className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[var(--muted-foreground)] mb-3">Con iconos</h3>
                    <div className="flex flex-wrap gap-3">
                      <Button className="gap-2">
                        <RiDownloadLine className="h-4 w-4" />
                        Descargar
                      </Button>
                      <Button variant="outline" className="gap-2">
                        Siguiente
                        <RiArrowRightLine className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[var(--muted-foreground)] mb-3">Estados</h3>
                    <div className="flex flex-wrap gap-3">
                      <Button disabled>Disabled</Button>
                      <Button className="animate-pulse">Loading...</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Form Elements */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Elementos de Formulario</h2>
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Input</label>
                      <Input placeholder="Escribe algo..." />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select</label>
                      <Select
                        value={selectValue}
                        onValueChange={setSelectValue}
                        options={[
                          { value: "opt1", label: "Opción 1" },
                          { value: "opt2", label: "Opción 2" },
                          { value: "opt3", label: "Opción 3" },
                        ]}
                        placeholder="Selecciona una opción"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Switch</label>
                      <div className="flex items-center gap-3">
                        <Switch size="sm" checked={switchValue} onCheckedChange={setSwitchValue} />
                        <Switch checked={switchValue} onCheckedChange={setSwitchValue} />
                        <Switch size="lg" checked={switchValue} onCheckedChange={setSwitchValue} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Checkbox</label>
                      <div className="space-y-2">
                        <Checkbox checked={checkboxValue} onCheckedChange={setCheckboxValue} label="Opción activa" />
                        <Checkbox checked={false} label="Opción inactiva" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Radio</label>
                      <RadioGroup
                        value={radioValue}
                        onValueChange={setRadioValue}
                        options={[
                          { value: "option1", label: "Opción 1" },
                          { value: "option2", label: "Opción 2" },
                        ]}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Badges */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Badges</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-3">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Progress & Avatar */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Progress & Avatar</h2>
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Progress: {progressValue}%</label>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setProgressValue(Math.max(0, progressValue - 10))}>-10</Button>
                        <Button size="sm" variant="outline" onClick={() => setProgressValue(Math.min(100, progressValue + 10))}>+10</Button>
                      </div>
                    </div>
                    <Progress value={progressValue} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Avatars</label>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>SM</AvatarFallback>
                      </Avatar>
                      <Avatar>
                        <AvatarFallback>MD</AvatarFallback>
                      </Avatar>
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>LG</AvatarFallback>
                      </Avatar>
                      <Avatar className="h-16 w-16">
                        <AvatarFallback>XL</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Alerts */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Alertas</h2>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <Alert variant="info" title="Información">
                    Este es un mensaje informativo para el usuario.
                  </Alert>
                  <Alert variant="success" title="Éxito">
                    La operación se completó correctamente.
                  </Alert>
                  <Alert variant="warning" title="Advertencia">
                    Ten cuidado con esta acción.
                  </Alert>
                  <Alert variant="error" title="Error" dismissible>
                    Algo salió mal. Por favor intenta de nuevo.
                  </Alert>
                </CardContent>
              </Card>
            </section>

            {/* Tabs */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Tabs</h2>
              <Card>
                <CardContent className="p-6">
                  <Tabs
                    tabs={[
                      { value: "tab1", label: "General", content: <p>Contenido de la pestaña General. Aquí puedes mostrar información básica.</p> },
                      { value: "tab2", label: "Configuración", content: <p>Contenido de Configuración. Ajustes y preferencias del usuario.</p> },
                      { value: "tab3", label: "Avanzado", content: <p>Opciones avanzadas para usuarios expertos.</p> },
                    ]}
                  />
                </CardContent>
              </Card>
            </section>

            {/* Tooltips */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Tooltips</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-4">
                    <Tooltip content="Tooltip arriba" side="top">
                      <Button variant="outline">Hover (Top)</Button>
                    </Tooltip>
                    <Tooltip content="Tooltip abajo" side="bottom">
                      <Button variant="outline">Hover (Bottom)</Button>
                    </Tooltip>
                    <Tooltip content="Tooltip izquierda" side="left">
                      <Button variant="outline">Hover (Left)</Button>
                    </Tooltip>
                    <Tooltip content="Tooltip derecha" side="right">
                      <Button variant="outline">Hover (Right)</Button>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Skeletons */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Skeletons (Loading States)</h2>
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-4">Shimmer Effect (Default)</h3>
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-6 w-1/2" />
                      <Skeleton className="h-6 w-5/6" />
                    </div>
                  </div>
                  <Divider />
                  <div>
                    <h3 className="text-sm font-medium mb-4">Pulse Effect</h3>
                    <div className="space-y-3">
                      <Skeleton variant="pulse" className="h-6 w-3/4" />
                      <Skeleton variant="pulse" className="h-6 w-1/2" />
                      <Skeleton variant="pulse" className="h-6 w-5/6" />
                    </div>
                  </div>
                  <Divider />
                  <div>
                    <h3 className="text-sm font-medium mb-4">Card Skeleton</h3>
                    <SkeletonCard />
                  </div>
                  <Divider />
                  <div>
                    <h3 className="text-sm font-medium mb-4">Avatar + Text Skeleton</h3>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Animations Demo */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Animaciones</h2>
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Button onClick={triggerAnimation} className="gap-2">
                      <RiRefreshLine className={`h-4 w-4 ${isAnimating ? "animate-spin" : ""}`} />
                      Trigger Animations
                    </Button>
                  </div>

                  {/* ALWAYS RUNNING ANIMATIONS */}
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    {/* Spin - Always Running */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-center">🔄 Spin</h3>
                      <div className="p-6 border border-[var(--border)] rounded-[var(--radius)] flex justify-center bg-[var(--muted)]/30">
                        <div className="animate-spin h-8 w-8 rounded-full border-4 border-[var(--primary)] border-t-transparent" />
                      </div>
                    </div>

                    {/* Ping - Always Running */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-center">📡 Ping</h3>
                      <div className="p-6 border border-[var(--border)] rounded-[var(--radius)] flex justify-center bg-[var(--muted)]/30">
                        <span className="relative flex h-6 w-6">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-6 w-6 bg-[var(--primary)]"></span>
                        </span>
                      </div>
                    </div>

                    {/* Pulse - Always Running */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-center">💓 Pulse</h3>
                      <div className="p-6 border border-[var(--border)] rounded-[var(--radius)] flex justify-center">
                        <div className="animate-pulse h-8 w-8 rounded-full bg-[var(--primary)]" />
                      </div>
                    </div>

                    {/* Bounce - Always Running */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-center">⬆️ Bounce</h3>
                      <div className="p-6 border border-[var(--border)] rounded-[var(--radius)] flex justify-center items-end h-24">
                        <div className="animate-bounce h-6 w-6 rounded-full bg-[var(--primary)]" />
                      </div>
                    </div>
                  </div>

                  {/* ADVANCED ANIMATIONS */}
                  <h3 className="text-lg font-semibold mb-4">✨ Animaciones Avanzadas (Siempre Activas)</h3>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    {/* Float */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-center">🎈 Float</h3>
                      <div className="p-6 border border-[var(--border)] rounded-[var(--radius)] flex justify-center h-24 items-center">
                        <div className="animate-float h-8 w-8 rounded-lg bg-[var(--primary)]" />
                      </div>
                    </div>

                    {/* Wiggle */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-center">👋 Wiggle</h3>
                      <div className="p-6 border border-[var(--border)] rounded-[var(--radius)] flex justify-center">
                        <div className="animate-wiggle text-4xl">👋</div>
                      </div>
                    </div>

                    {/* Heartbeat */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-center">❤️ Heartbeat</h3>
                      <div className="p-6 border border-[var(--border)] rounded-[var(--radius)] flex justify-center">
                        <RiHeartLine className="h-8 w-8 text-red-500 animate-heartbeat" />
                      </div>
                    </div>

                    {/* Glow */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-center">✨ Glow</h3>
                      <div className="p-6 border border-[var(--border)] rounded-[var(--radius)] flex justify-center">
                        <div className="animate-glow h-8 w-8 rounded-full bg-[var(--primary)]" />
                      </div>
                    </div>
                  </div>

                  {/* SHIMMER & GRADIENT */}
                  <h3 className="text-lg font-semibold mb-4">🌈 Shimmer & Gradientes</h3>
                  <div className="grid gap-6 md:grid-cols-2 mb-8">
                    {/* Shimmer */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Shimmer Effect</h3>
                      <div className="skeleton-shimmer h-16 rounded-[var(--radius)]" />
                    </div>

                    {/* Gradient Animation */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Animated Gradient</h3>
                      <div className="animate-gradient h-16 rounded-[var(--radius)] text-white flex items-center justify-center font-bold">
                        Gradient Flow
                      </div>
                    </div>
                  </div>

                  {/* CLICK TO TRIGGER ANIMATIONS */}
                  <h3 className="text-lg font-semibold mb-4">🖱️ Click para Activar</h3>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    {/* Shake */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-center">Shake</h3>
                      <div 
                        className={`p-4 border border-[var(--border)] rounded-[var(--radius-lg)] cursor-pointer text-center bg-[var(--destructive)]/10 ${isAnimating ? "animate-shake" : ""}`}
                        onClick={triggerAnimation}
                      >
                        Click me!
                      </div>
                    </div>

                    {/* Rubber Band */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-center">Rubber Band</h3>
                      <div 
                        className={`p-4 border border-[var(--border)] rounded-[var(--radius-lg)] cursor-pointer text-center bg-[var(--success)]/10 ${isAnimating ? "animate-rubber-band" : ""}`}
                        onClick={triggerAnimation}
                      >
                        Click me!
                      </div>
                    </div>

                    {/* Jello */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-center">Jello</h3>
                      <div 
                        className={`p-4 border border-[var(--border)] rounded-[var(--radius-lg)] cursor-pointer text-center bg-[var(--warning)]/10 ${isAnimating ? "animate-jello" : ""}`}
                        onClick={triggerAnimation}
                      >
                        Click me!
                      </div>
                    </div>

                    {/* Tada */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-center">Tada</h3>
                      <div 
                        className={`p-4 border border-[var(--border)] rounded-[var(--radius-lg)] cursor-pointer text-center bg-[var(--info)]/10 ${isAnimating ? "animate-tada" : ""}`}
                        onClick={triggerAnimation}
                      >
                        Click me!
                      </div>
                    </div>
                  </div>

                  {/* HOVER ANIMATIONS */}
                  <h3 className="text-lg font-semibold mb-4">🎯 Hover Animations</h3>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Hover Scale */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Hover Scale</h3>
                      <div className="p-4 border border-[var(--border)] rounded-[var(--radius)] transition-transform duration-200 hover:scale-110 cursor-pointer text-center">
                        Hover me
                      </div>
                    </div>

                    {/* Hover Lift */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Hover Lift + Shadow</h3>
                      <div className="p-4 border border-[var(--border)] rounded-[var(--radius)] transition-all duration-200 hover:-translate-y-2 hover:shadow-xl cursor-pointer text-center">
                        Hover me
                      </div>
                    </div>

                    {/* Hover Glow */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Hover Glow</h3>
                      <div className="p-4 border border-[var(--border)] rounded-[var(--radius)] transition-all duration-300 hover:shadow-[0_0_20px_var(--primary)] cursor-pointer text-center">
                        Hover me
                      </div>
                    </div>

                    {/* Color Transition */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Color Fill</h3>
                      <div className="p-4 border border-[var(--border)] rounded-[var(--radius)] transition-all duration-300 hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] cursor-pointer text-center">
                        Hover me
                      </div>
                    </div>

                    {/* Border Animation */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Border Color</h3>
                      <div className="p-4 border-2 border-[var(--border)] rounded-[var(--radius)] transition-all duration-200 hover:border-[var(--primary)] cursor-pointer text-center">
                        Hover me
                      </div>
                    </div>

                    {/* Icon Animations */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Icon Effects</h3>
                      <div className="p-4 border border-[var(--border)] rounded-[var(--radius)] flex gap-4 justify-center">
                        <RiHeartLine className="h-6 w-6 transition-all hover:scale-150 hover:text-red-500 cursor-pointer" />
                        <RiStarLine className="h-6 w-6 transition-all hover:rotate-180 hover:text-yellow-500 cursor-pointer" />
                        <RiCheckLine className="h-6 w-6 transition-all hover:scale-125 hover:text-green-500 cursor-pointer" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Cards Demo */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Cards</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                  <CardHeader>
                    <CardTitle>Card Interactiva</CardTitle>
                    <CardDescription>Hover para ver el efecto de elevación</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Las cards pueden tener animaciones de hover para indicar interactividad.
                    </p>
                  </CardContent>
                </Card>

                <Card className="transition-all duration-200 hover:border-[var(--primary)] cursor-pointer">
                  <CardHeader>
                    <CardTitle>Card con Borde</CardTitle>
                    <CardDescription>Hover para ver el cambio de borde</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Otra opción es cambiar el color del borde al hacer hover.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* NEW COMPONENTS SECTION */}
            <Divider className="my-8">Nuevos Componentes AlignUI</Divider>

            {/* Modal */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Modal / Dialog</h2>
              <Card>
                <CardContent className="p-6">
                  <Button onClick={() => setIsModalOpen(true)}>Abrir Modal</Button>
                  <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
                    <ModalContent>
                      <ModalHeader>
                        <ModalTitle>Confirmar Acción</ModalTitle>
                        <ModalDescription>
                          ¿Estás seguro de que deseas continuar con esta acción? Esta operación no se puede deshacer.
                        </ModalDescription>
                      </ModalHeader>
                      <div className="py-4">
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Contenido adicional del modal puede ir aquí.
                        </p>
                      </div>
                    </ModalContent>
                    <ModalFooter>
                      <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                      <Button onClick={() => setIsModalOpen(false)}>Confirmar</Button>
                    </ModalFooter>
                  </Modal>
                </CardContent>
              </Card>
            </section>

            {/* Dropdown Menu */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Dropdown Menu</h2>
              <Card>
                <CardContent className="p-6 flex gap-4">
                  <DropdownMenu
                    trigger={
                      <Button variant="outline" className="gap-2">
                        <RiMoreLine className="h-4 w-4" />
                        Opciones
                      </Button>
                    }
                  >
                    <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                    <DropdownMenuItem icon={<RiUserLine className="h-4 w-4" />}>
                      Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem icon={<RiSettings3Line className="h-4 w-4" />}>
                      Configuración
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem icon={<RiEditLine className="h-4 w-4" />}>
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem icon={<RiFileCopyLine className="h-4 w-4" />}>
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem icon={<RiDeleteBinLine className="h-4 w-4" />} destructive>
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenu>

                  <DropdownMenu
                    trigger={<Button size="icon" variant="ghost"><RiMoreLine className="h-4 w-4" /></Button>}
                    align="start"
                  >
                    <DropdownMenuItem>Opción 1</DropdownMenuItem>
                    <DropdownMenuItem>Opción 2</DropdownMenuItem>
                    <DropdownMenuItem>Opción 3</DropdownMenuItem>
                  </DropdownMenu>
                </CardContent>
              </Card>
            </section>

            {/* Popover */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Popover</h2>
              <Card>
                <CardContent className="p-6 flex gap-4">
                  <Popover
                    trigger={<Button variant="outline">Click para Popover</Button>}
                    side="bottom"
                    align="start"
                  >
                    <div className="space-y-2">
                      <h4 className="font-medium">Información</h4>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Este es un popover con contenido personalizado.
                      </p>
                      <Button size="sm" className="w-full">Acción</Button>
                    </div>
                  </Popover>

                  <Popover
                    trigger={<Button variant="outline">Popover Derecha</Button>}
                    side="right"
                  >
                    <p className="text-sm">Contenido a la derecha</p>
                  </Popover>
                </CardContent>
              </Card>
            </section>

            {/* Slider */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Slider</h2>
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Slider con valor</label>
                    <Slider value={sliderValue} onValueChange={setSliderValue} showValue />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Slider simple</label>
                    <Slider value={30} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Slider deshabilitado</label>
                    <Slider value={50} disabled />
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Textarea */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Textarea</h2>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descripción</label>
                    <Textarea placeholder="Escribe una descripción..." />
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Spinner & Loading */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Spinner / Loading</h2>
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-4">Spinner Circular</h3>
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <Spinner size="sm" />
                        <p className="text-xs mt-2">Small</p>
                      </div>
                      <div className="text-center">
                        <Spinner size="md" />
                        <p className="text-xs mt-2">Medium</p>
                      </div>
                      <div className="text-center">
                        <Spinner size="lg" />
                        <p className="text-xs mt-2">Large</p>
                      </div>
                    </div>
                  </div>
                  <Divider />
                  <div>
                    <h3 className="text-sm font-medium mb-4">Loading Dots</h3>
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <Spinner size="sm" variant="dots" />
                        <p className="text-xs mt-2">Small</p>
                      </div>
                      <div className="text-center">
                        <Spinner size="md" variant="dots" />
                        <p className="text-xs mt-2">Medium</p>
                      </div>
                      <div className="text-center">
                        <Spinner size="lg" variant="dots" />
                        <p className="text-xs mt-2">Large</p>
                      </div>
                    </div>
                  </div>
                  <Divider />
                  <div>
                    <h3 className="text-sm font-medium mb-4">En Botones</h3>
                    <div className="flex items-center gap-4">
                      <Button disabled className="gap-2">
                        <Spinner size="sm" />
                        Cargando...
                      </Button>
                      <Button variant="outline" disabled className="gap-2">
                        <Spinner size="sm" variant="dots" />
                        Procesando
                      </Button>
                      <Button variant="secondary" className="gap-2 animate-pulse">
                        <Spinner size="sm" />
                        Guardando...
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Kbd */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Keyboard Shortcuts (Kbd)</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Kbd>⌘</Kbd>
                      <Kbd>K</Kbd>
                      <span className="text-sm text-[var(--muted-foreground)] ml-2">Búsqueda</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Kbd>⌘</Kbd>
                      <Kbd>S</Kbd>
                      <span className="text-sm text-[var(--muted-foreground)] ml-2">Guardar</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Kbd>Esc</Kbd>
                      <span className="text-sm text-[var(--muted-foreground)] ml-2">Cerrar</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Kbd>Ctrl</Kbd>
                      <Kbd>Shift</Kbd>
                      <Kbd>P</Kbd>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Avatar Group */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Avatar Group</h2>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-8">
                    <div>
                      <p className="text-sm font-medium mb-2">Small</p>
                      <AvatarGroup
                        size="sm"
                        avatars={[
                          { name: "María García" },
                          { name: "Carlos López" },
                          { name: "Ana Martínez" },
                          { name: "Pedro Ruiz" },
                          { name: "Laura F" },
                        ]}
                        max={3}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Medium</p>
                      <AvatarGroup
                        avatars={[
                          { name: "María García" },
                          { name: "Carlos López" },
                          { name: "Ana Martínez" },
                          { name: "Pedro Ruiz" },
                        ]}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Large</p>
                      <AvatarGroup
                        size="lg"
                        avatars={[
                          { name: "María García" },
                          { name: "Carlos López" },
                          { name: "Ana Martínez" },
                        ]}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Tags */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Tags</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-2">
                    <Tag>Default</Tag>
                    <Tag variant="primary">Primary</Tag>
                    <Tag variant="success">Success</Tag>
                    <Tag variant="warning">Warning</Tag>
                    <Tag variant="error">Error</Tag>
                    <Tag variant="primary" removable onRemove={() => {}}>Removable</Tag>
                    <Tag size="sm">Small</Tag>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Divider */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Divider</h2>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm">Contenido arriba</p>
                  <Divider />
                  <p className="text-sm">Contenido abajo</p>
                  <Divider>O continúa con</Divider>
                  <p className="text-sm">Más contenido</p>
                </CardContent>
              </Card>
            </section>

            {/* Empty State */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Empty State</h2>
              <Card>
                <CardContent className="p-6">
                  <EmptyState
                    icon={<RiInboxLine className="h-8 w-8" />}
                    title="No hay elementos"
                    description="Comienza creando tu primer elemento para verlo aquí."
                    action={{
                      label: "Crear Elemento",
                      onClick: () => {},
                    }}
                  />
                </CardContent>
              </Card>
            </section>

            {/* ============ NEW COMPONENTS ============ */}

            {/* Accordion */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Accordion</h2>
              <Card>
                <CardContent className="p-6">
                  <Accordion
                    items={[
                      { id: "1", title: "¿Qué es HubEnts?", content: "HubEnts es una plataforma de gestión de eventos que te ayuda a organizar bodas, fiestas y eventos corporativos de manera eficiente." },
                      { id: "2", title: "¿Cómo puedo empezar?", content: "Simplemente crea una cuenta, configura tu primer evento y comienza a agregar invitados, proveedores y tareas." },
                      { id: "3", title: "¿Cuánto cuesta?", content: "Ofrecemos planes desde gratuitos hasta empresariales. Consulta nuestra página de precios para más detalles." },
                    ]}
                  />
                </CardContent>
              </Card>
            </section>

            {/* Breadcrumbs */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Breadcrumbs</h2>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <Breadcrumbs
                    items={[
                      { label: "Dashboard", href: "/dashboard" },
                      { label: "Eventos", href: "/dashboard/events" },
                      { label: "Boda García-López" },
                    ]}
                  />
                  <Divider />
                  <Breadcrumbs
                    showHome={false}
                    items={[
                      { label: "Configuración", href: "#" },
                      { label: "Perfil", href: "#" },
                      { label: "Notificaciones" },
                    ]}
                  />
                </CardContent>
              </Card>
            </section>

            {/* Calendar / DatePicker */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Calendar / DatePicker</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-6">
                    <Calendar
                      selectedDate={selectedDate}
                      onDateSelect={setSelectedDate}
                      highlightedDates={[
                        new Date(2024, 11, 25),
                        new Date(2024, 11, 31),
                      ]}
                    />
                    <div className="flex-1 min-w-[200px]">
                      <h3 className="font-medium mb-2">Fecha Seleccionada:</h3>
                      <p className="text-lg text-[var(--primary)]">
                        {selectedDate?.toLocaleDateString("es-ES", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-[var(--muted-foreground)] mt-4">
                        Las fechas con círculo verde son eventos destacados.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Drawer */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Drawer</h2>
              <Card>
                <CardContent className="p-6">
                  <Button onClick={() => setIsDrawerOpen(true)}>
                    Abrir Drawer
                  </Button>
                  <Drawer
                    isOpen={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
                    title="Configuración"
                  >
                    <div className="space-y-4">
                      <p className="text-[var(--muted-foreground)]">
                        Este es un panel lateral que se desliza desde el costado.
                      </p>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nombre</label>
                        <Input placeholder="Tu nombre" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <Input type="email" placeholder="tu@email.com" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Notificaciones</span>
                        <Switch checked={switchValue} onCheckedChange={setSwitchValue} />
                      </div>
                      <Divider />
                      <div className="flex gap-2">
                        <Button onClick={() => setIsDrawerOpen(false)} className="flex-1">
                          Guardar
                        </Button>
                        <Button variant="outline" onClick={() => setIsDrawerOpen(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </Drawer>
                </CardContent>
              </Card>
            </section>

            {/* File Upload */}
            <section>
              <h2 className="text-2xl font-bold mb-4">File Upload</h2>
              <Card>
                <CardContent className="p-6">
                  <FileUpload
                    accept="image/*,.pdf,.doc,.docx"
                    multiple
                    maxSize={10}
                  />
                </CardContent>
              </Card>
            </section>

            {/* Table */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Table</h2>
              <Card>
                <CardContent className="p-6">
                  <Table
                    data={[
                      { id: 1, name: "Boda García-López", date: "15 Mar 2024", guests: 150, status: "Confirmado" },
                      { id: 2, name: "Cumpleaños Ana", date: "22 Mar 2024", guests: 50, status: "Pendiente" },
                      { id: 3, name: "Evento Corporativo", date: "1 Abr 2024", guests: 200, status: "En progreso" },
                      { id: 4, name: "Quinceañera María", date: "10 Abr 2024", guests: 120, status: "Confirmado" },
                    ]}
                    columns={[
                      { key: "name", header: "Evento" },
                      { key: "date", header: "Fecha" },
                      { key: "guests", header: "Invitados", className: "text-right" },
                      { 
                        key: "status", 
                        header: "Estado",
                        render: (item) => (
                          <Badge variant={
                            item.status === "Confirmado" ? "success" :
                            item.status === "Pendiente" ? "warning" : "secondary"
                          }>
                            {item.status as string}
                          </Badge>
                        )
                      },
                    ]}
                    striped
                  />
                </CardContent>
              </Card>
            </section>

            {/* Rating */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Rating</h2>
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium w-24">Interactivo:</span>
                    <Rating value={ratingValue} onChange={setRatingValue} size="lg" />
                    <span className="text-sm text-[var(--muted-foreground)]">{ratingValue} de 5</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium w-24">Solo lectura:</span>
                    <Rating value={4} readonly />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium w-24">Tamaños:</span>
                    <Rating value={3} readonly size="sm" />
                    <Rating value={3} readonly size="md" />
                    <Rating value={3} readonly size="lg" />
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Notifications */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Notifications</h2>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <Notification
                    title="Nuevo mensaje"
                    message="María García te ha enviado un mensaje sobre el evento."
                    time="Hace 5 min"
                    unread
                    onClose={() => {}}
                  />
                  <Notification
                    title="Pago recibido"
                    message="Se ha procesado el pago de $500 correctamente."
                    type="success"
                    time="Hace 1 hora"
                  />
                  <Notification
                    title="Error de sincronización"
                    message="No se pudo sincronizar con el calendario."
                    type="error"
                    onAction={() => {}}
                    actionLabel="Reintentar"
                  />
                  <Notification
                    title="Recordatorio"
                    message="La reunión con el cliente comienza en 30 minutos."
                    type="warning"
                  />
                </CardContent>
              </Card>
            </section>

            {/* Profile Card */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Profile Card</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <ProfileCard
                      name="María García"
                      role="Event Planner"
                      badges={["Pro", "Verificado"]}
                      stats={[
                        { label: "Eventos", value: 48 },
                        { label: "Clientes", value: 156 },
                        { label: "Rating", value: "4.9" },
                      ]}
                      onFollow={() => {}}
                      onMessage={() => {}}
                    />
                    <ProfileCard
                      name="Carlos López"
                      role="Fotógrafo"
                      badges={["Premium"]}
                      stats={[
                        { label: "Fotos", value: "2.4k" },
                        { label: "Eventos", value: 89 },
                      ]}
                      onFollow={() => {}}
                    />
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Command Menu */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Command Menu</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Button onClick={() => setIsCommandOpen(true)} variant="outline" className="gap-2">
                      <RiSearchLine className="h-4 w-4" />
                      Buscar...
                      <Kbd>⌘K</Kbd>
                    </Button>
                    <span className="text-sm text-[var(--muted-foreground)]">
                      O presiona <Kbd>⌘</Kbd> + <Kbd>K</Kbd>
                    </span>
                  </div>
                  <CommandMenu
                    isOpen={isCommandOpen}
                    onClose={() => setIsCommandOpen(false)}
                    items={[
                      { id: "1", label: "Ir al Dashboard", shortcut: "⌘D", group: "Navegación", onSelect: () => {} },
                      { id: "2", label: "Ver Eventos", shortcut: "⌘E", group: "Navegación", onSelect: () => {} },
                      { id: "3", label: "Nuevo Evento", shortcut: "⌘N", group: "Acciones", onSelect: () => {} },
                      { id: "4", label: "Configuración", shortcut: "⌘,", group: "Acciones", onSelect: () => {} },
                      { id: "5", label: "Cerrar Sesión", group: "Cuenta", onSelect: () => {} },
                    ]}
                  />
                </CardContent>
              </Card>
            </section>

            {/* Component Count Summary */}
            <section>
              <Card className="bg-[var(--primary)] text-white animate-gradient">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-4">📊 Resumen de Componentes</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center animate-count-up">
                      <p className="text-4xl font-bold">35+</p>
                      <p className="text-sm opacity-80">Componentes</p>
                    </div>
                    <div className="text-center animate-count-up stagger-1">
                      <p className="text-4xl font-bold">20+</p>
                      <p className="text-sm opacity-80">Animaciones</p>
                    </div>
                    <div className="text-center animate-count-up stagger-2">
                      <p className="text-4xl font-bold">6</p>
                      <p className="text-sm opacity-80">Presets Color</p>
                    </div>
                    <div className="text-center animate-count-up stagger-3">
                      <p className="text-4xl font-bold">~95%</p>
                      <p className="text-sm opacity-80">AlignUI</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
