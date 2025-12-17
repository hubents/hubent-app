"use client";

import { RiSearchLine, RiNotification3Line, RiMoonLine, RiSunLine } from "@remixicon/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function Header() {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-6">
      {/* Search */}
      <div className="relative w-96">
        <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input
          type="search"
          placeholder="Buscar eventos, tareas, proveedores..."
          className="pl-10"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? (
            <RiSunLine className="h-5 w-5" />
          ) : (
            <RiMoonLine className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <RiNotification3Line className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--destructive)]" />
        </Button>

        {/* User */}
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-[var(--primary)] text-white">
              JD
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="text-sm font-medium">Juan Demo</p>
            <p className="text-xs text-[var(--muted-foreground)]">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
