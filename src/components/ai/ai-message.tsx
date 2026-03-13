"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  CalendarDays,
  Users,
  Receipt,
  ClipboardList,
  Building2,
  Settings,
  CreditCard,
  LayoutDashboard,
  FileText,
  ListChecks,
  Contact,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const INTERNAL_ROUTE_PREFIX = ["/dashboard", "/vendor", "/admin", "/developers"];

function isInternalLink(href: string): boolean {
  if (!href) return false;
  return INTERNAL_ROUTE_PREFIX.some((p) => href.startsWith(p));
}

interface RouteInfo {
  icon: LucideIcon;
  label: string;
}

const ROUTE_MAP: Record<string, RouteInfo> = {
  "/dashboard": { icon: LayoutDashboard, label: "Dashboard" },
  "/dashboard/events": { icon: CalendarDays, label: "Eventos" },
  "/dashboard/tasks": { icon: ListChecks, label: "Tareas" },
  "/dashboard/calendar": { icon: CalendarDays, label: "Calendario" },
  "/dashboard/crm": { icon: ClipboardList, label: "CRM" },
  "/dashboard/contacts": { icon: Contact, label: "Contactos" },
  "/dashboard/vendors": { icon: Building2, label: "Proveedores" },
  "/dashboard/finance": { icon: Receipt, label: "Finanzas" },
  "/dashboard/finance/invoices": { icon: Receipt, label: "Facturas" },
  "/dashboard/finance/quotes": { icon: Receipt, label: "Presupuestos" },
  "/dashboard/finance/proformas": { icon: Receipt, label: "Proformas" },
  "/dashboard/finance/delivery-notes": { icon: Receipt, label: "Albaranes" },
  "/dashboard/finance/credit-notes": { icon: Receipt, label: "Rectificativas" },
  "/dashboard/finance/products": { icon: Receipt, label: "Productos" },
  "/dashboard/finance/reports": { icon: Receipt, label: "Reportes Contables" },
  "/dashboard/forms": { icon: FileText, label: "Formularios" },
  "/dashboard/team": { icon: Users, label: "Equipo" },
  "/dashboard/settings": { icon: Settings, label: "Configuración" },
  "/dashboard/settings/roles": { icon: Settings, label: "Roles y Permisos" },
  "/dashboard/settings/billing": { icon: CreditCard, label: "Plan y Facturación" },
};

function getRouteInfo(href: string): RouteInfo {
  if (ROUTE_MAP[href]) return ROUTE_MAP[href];

  const eventMatch = href.match(/\/dashboard\/events\/\d+\/run-sheet/);
  if (eventMatch) return { icon: Clock, label: "Orden del Día" };

  const eventDetailMatch = href.match(/\/dashboard\/events\/\d+/);
  if (eventDetailMatch) return { icon: CalendarDays, label: "Detalle del Evento" };

  for (const [route, info] of Object.entries(ROUTE_MAP)) {
    if (href.startsWith(route + "/")) return info;
  }

  return { icon: ArrowRight, label: href.replace(/^\/dashboard\//, "").replace(/\//g, " › ") || "Ir" };
}

function extractInternalLinks(content: string): { href: string; label: string }[] {
  const linkRegex = /\[([^\]]+)\]\((\/(?:dashboard|vendor|admin|developers)[^)]+)\)/g;
  const seen = new Set<string>();
  const links: { href: string; label: string }[] = [];
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const href = match[2];
    if (!seen.has(href)) {
      seen.add(href);
      links.push({ href, label: match[1] });
    }
  }
  return links;
}

interface AIMessageProps {
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
  onFeedback?: (rating: number) => void;
}

export function AIMessage({ role, content, isLoading, onFeedback }: AIMessageProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<number | null>(null);
  const router = useRouter();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (rating: number) => {
    setFeedback(rating);
    onFeedback?.(rating);
  };

  const handleNavigate = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router]
  );

  const quickActions = useMemo(() => {
    if (role === "user" || isLoading || !content) return [];
    return extractInternalLinks(content);
  }, [content, role, isLoading]);

  const isUser = role === "user";

  const markdownComponents = useMemo(
    () => ({
      a: ({ href, children }: { href?: string; children?: ReactNode }) => {
        if (href && isInternalLink(href)) {
          const info = getRouteInfo(href);
          const Icon = info.icon;
          return (
            <button
              onClick={() => handleNavigate(href)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-colors font-medium no-underline cursor-pointer border-0"
            >
              <Icon className="w-3 h-3" />
              <span>{children}</span>
            </button>
          );
        }
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 underline">
            {children}
          </a>
        );
      },
    }),
    [handleNavigate]
  );

  return (
    <div className={cn("flex gap-3 py-4", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
          isUser
            ? "bg-[var(--primary)] text-white"
            : "bg-[var(--ai-accent)] text-[var(--ai-accent-foreground)]"
        )}
      >
        {isUser ? "Tú" : <Sparkles className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={cn("flex-1 max-w-[85%]", isUser && "text-right")}>
        <div
          className={cn(
            "inline-block px-4 py-3 rounded-2xl text-sm",
            isUser
              ? "bg-[var(--primary)] text-white rounded-br-md"
              : "bg-[var(--muted)] text-[var(--foreground)] rounded-bl-md"
          )}
        >
          {isLoading && !content ? (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          ) : isUser ? (
            <div className="whitespace-pre-wrap break-words">
              {content}
            </div>
          ) : (
            <div className="ai-prose prose prose-sm max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_code]:bg-black/10 [&_code]:dark:bg-white/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Quick Action Buttons for internal links */}
        {!isUser && quickActions.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {quickActions.map((action) => {
              const info = getRouteInfo(action.href);
              const Icon = info.icon;
              return (
                <button
                  key={action.href}
                  onClick={() => handleNavigate(action.href)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/30 transition-all cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{action.label}</span>
                  <ArrowRight className="w-3 h-3 opacity-50" />
                </button>
              );
            })}
          </div>
        )}

        {/* Actions for assistant messages */}
        {!isUser && content && !isLoading && (
          <div className="flex items-center gap-1 mt-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7",
                feedback === 5
                  ? "text-green-500"
                  : "text-[var(--muted-foreground)] hover:text-green-500"
              )}
              onClick={() => handleFeedback(5)}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7",
                feedback === 1
                  ? "text-red-500"
                  : "text-[var(--muted-foreground)] hover:text-red-500"
              )}
              onClick={() => handleFeedback(1)}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
