"use client";

import { hgIcon } from "@/components/ui/hg-icon";
import {
  Moon02Icon,
  Sun01Icon,
  Logout01Icon,
  Settings01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";

const Moon = hgIcon(Moon02Icon);
const Sun = hgIcon(Sun01Icon);
const LogOut = hgIcon(Logout01Icon);
const Settings = hgIcon(Settings01Icon);
const User = hgIcon(UserCircleIcon);
import { AIHeaderButton } from "@/components/ai/ai-header-button";
import { CalendarHeaderButton } from "@/components/calendar/calendar-header-button";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

export function Header() {
  const [isDark, setIsDark] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  // All org types now use unified /dashboard portal
  const isVendor = false;

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

  // Greeting based on time of day + first name from session
  const hour = new Date().getHours();
  const greetingPrefix =
    hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const firstName =
    session?.user?.name?.split(" ").filter(Boolean)[0] || "";
  const greeting = firstName ? `${greetingPrefix}, ${firstName}` : greetingPrefix;

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between"
      style={{
        padding: "22px 34px 14px",
        gap: "14px",
        background: "var(--bg-app)",
      }}
    >
      {/* Greeting (replaces search) */}
      <h1
        className="text-[22px] font-semibold text-[var(--ink-1)] truncate m-0"
        style={{ letterSpacing: "-0.015em" }}
      >
        {greeting}
      </h1>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Calendar */}
        <CalendarHeaderButton />

        {/* AI Assistant */}
        <AIHeaderButton />

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
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
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
