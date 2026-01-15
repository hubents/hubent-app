"use client";

import { RiSearchLine, RiMoonLine, RiSunLine, RiLogoutBoxLine, RiSettings4Line, RiUserLine } from "@remixicon/react";
import { AIHeaderButton } from "@/components/ai/ai-header-button";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export function Header() {
  const [isDark, setIsDark] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/login", redirect: true });
  };

  // Get user initials
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const userName = session?.user?.name || "Usuario";
  const userEmail = session?.user?.email || "";
  const userImage = session?.user?.image;
  const userInitials = getInitials(session?.user?.name);

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
        {/* AI Assistant */}
        <AIHeaderButton />

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? (
            <RiSunLine className="h-5 w-5" />
          ) : (
            <RiMoonLine className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications */}
        <NotificationCenter />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-lg p-1 hover:bg-[var(--accent)] transition-colors cursor-pointer">
              <Avatar>
                {userImage && <AvatarImage src={userImage} alt={userName} />}
                <AvatarFallback className="bg-[var(--primary)] text-white">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{userEmail}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <RiUserLine className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <RiSettings4Line className="mr-2 h-4 w-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <RiLogoutBoxLine className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
