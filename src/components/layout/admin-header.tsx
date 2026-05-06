"use client";

import { hgIcon } from "@/components/ui/hg-icon";
import {
  Notification01Icon,
  Moon02Icon,
  Sun01Icon,
  Logout01Icon,
  Settings01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";

const RiNotification3Line = hgIcon(Notification01Icon);
const RiMoonLine = hgIcon(Moon02Icon);
const RiSunLine = hgIcon(Sun01Icon);
const RiLogoutBoxLine = hgIcon(Logout01Icon);
const RiSettings4Line = hgIcon(Settings01Icon);
const RiUserLine = hgIcon(UserCircleIcon);
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
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function AdminHeader() {
  const [isDark, setIsDark] = useState(false);
  const [healthStatus, setHealthStatus] = useState<"operational" | "degraded" | "down" | "loading">("loading");
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/monitoring")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setHealthStatus(d.data.health.overall);
        else setHealthStatus("down");
      })
      .catch(() => setHealthStatus("down"));
  }, []);

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

  const userName = session?.user?.name || "Admin";
  const userEmail = session?.user?.email || "";
  const userImage = session?.user?.image;
  const userInitials = getInitials(session?.user?.name);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-end border-b border-[var(--border)] bg-[var(--card)] px-6">
      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Health indicator */}
        <Link
          href="/admin/status"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-[var(--muted)] transition-colors"
          title={`Platform: ${healthStatus}`}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              healthStatus === "operational" && "bg-green-500 animate-pulse",
              healthStatus === "degraded" && "bg-yellow-500 animate-pulse",
              healthStatus === "down" && "bg-red-500 animate-pulse",
              healthStatus === "loading" && "bg-gray-400 animate-pulse"
            )}
          />
          <span className="hidden md:inline text-[var(--muted-foreground)]">
            {healthStatus === "operational" ? "Operativo" :
             healthStatus === "degraded" ? "Degradado" :
             healthStatus === "down" ? "Ca\u00eddo" : "..."}
          </span>
        </Link>

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
            <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
              <RiUserLine className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
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
