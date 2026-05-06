"use client";

import { useEvent } from "@/contexts/event-context";
import { useRouter } from "next/navigation";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  ArrowLeft01Icon,
  Menu01Icon,
  Notification01Icon,
} from "@hugeicons/core-free-icons";

const RiArrowLeftLine = hgIcon(ArrowLeft01Icon);
const RiMenuLine = hgIcon(Menu01Icon);
const RiNotification3Line = hgIcon(Notification01Icon);
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "next-auth/react";
import {
  Logout01Icon,
  Settings01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";

const RiLogoutBoxLine = hgIcon(Logout01Icon);
const RiSettings4Line = hgIcon(Settings01Icon);
const RiUserLine = hgIcon(UserCircleIcon);
import Link from "next/link";

export function MobileHeader() {
  const { activeEvent, setActiveEvent, isEventView } = useEvent();
  const { data: session } = useSession();
  const router = useRouter();

  const handleBack = () => {
    setActiveEvent(null);
    router.push("/dashboard/events");
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const userName = session?.user?.name || "Usuario";
  const userImage = session?.user?.image;
  const userInitials = getInitials(session?.user?.name);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 md:hidden">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {isEventView && activeEvent ? (
          <>
            <button
              onClick={handleBack}
              className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-[var(--muted)] transition-colors"
            >
              <RiArrowLeftLine className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-sm truncate max-w-[180px]">
                {activeEvent.name}
              </h1>
            </div>
          </>
        ) : (
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-bold">hubents</span>
          </Link>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <RiNotification3Line className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--destructive)]" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center rounded-full">
              <Avatar className="h-8 w-8">
                {userImage && <AvatarImage src={userImage} alt={userName} />}
                <AvatarFallback className="bg-[var(--primary)] text-white text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{userName}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center gap-2">
                <RiUserLine className="h-4 w-4" />
                Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center gap-2">
                <RiSettings4Line className="h-4 w-4" />
                Configuración
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="text-red-600"
            >
              <RiLogoutBoxLine className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
