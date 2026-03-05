import {
  CalendarDays,
  CheckSquare,
  Users,
  DollarSign,
  CreditCard,
  FileText,
  UserPlus,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

export type CalendarItemType =
  | "event"
  | "task"
  | "meeting"
  | "payment"
  | "task_payment"
  | "document"
  | "lead"
  | "schedule";

export interface CalendarItem {
  id: string;
  type: CalendarItemType;
  title: string;
  date: string; // ISO
  endDate?: string;
  time?: string; // "HH:mm"
  color: string;
  href: string;
  meta?: {
    status?: string;
    amount?: number;
    currency?: string;
    eventName?: string;
    location?: string;
    priority?: string;
  };
}

// ============================================
// CONSTANTS
// ============================================

export const CALENDAR_COLORS: Record<CalendarItemType, string> = {
  event: "bg-blue-500",
  task: "bg-green-500",
  meeting: "bg-purple-500",
  payment: "bg-red-500",
  task_payment: "bg-orange-500",
  document: "bg-amber-500",
  lead: "bg-cyan-500",
  schedule: "bg-indigo-500",
};

export const CALENDAR_TEXT_COLORS: Record<CalendarItemType, string> = {
  event: "text-blue-700 dark:text-blue-300",
  task: "text-green-700 dark:text-green-300",
  meeting: "text-purple-700 dark:text-purple-300",
  payment: "text-red-700 dark:text-red-300",
  task_payment: "text-orange-700 dark:text-orange-300",
  document: "text-amber-700 dark:text-amber-300",
  lead: "text-cyan-700 dark:text-cyan-300",
  schedule: "text-indigo-700 dark:text-indigo-300",
};

export const CALENDAR_BG_LIGHT: Record<CalendarItemType, string> = {
  event: "bg-blue-100 dark:bg-blue-500/20",
  task: "bg-green-100 dark:bg-green-500/20",
  meeting: "bg-purple-100 dark:bg-purple-500/20",
  payment: "bg-red-100 dark:bg-red-500/20",
  task_payment: "bg-orange-100 dark:bg-orange-500/20",
  document: "bg-amber-100 dark:bg-amber-500/20",
  lead: "bg-cyan-100 dark:bg-cyan-500/20",
  schedule: "bg-indigo-100 dark:bg-indigo-500/20",
};

export const CALENDAR_LABELS: Record<CalendarItemType, string> = {
  event: "Eventos",
  task: "Tareas",
  meeting: "Reuniones",
  payment: "Pagos",
  task_payment: "Pagos de tarea",
  document: "Documentos",
  lead: "Leads",
  schedule: "Cronograma",
};

export const CALENDAR_ICONS: Record<CalendarItemType, LucideIcon> = {
  event: CalendarDays,
  task: CheckSquare,
  meeting: Users,
  payment: DollarSign,
  task_payment: CreditCard,
  document: FileText,
  lead: UserPlus,
  schedule: CalendarClock,
};

// ============================================
// HELPERS
// ============================================

export function getDateKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

export function groupItemsByDate(
  items: CalendarItem[]
): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const key = getDateKey(item.date);
    const existing = map.get(key) || [];
    existing.push(item);
    map.set(key, existing);
  }
  return map;
}

export function formatRelativeDay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return "Hoy";
  if (date.getTime() === tomorrow.getTime()) return "Mañana";

  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function getMonthRange(year: number, month: number) {
  const from = new Date(year, month - 1, 1);
  from.setDate(from.getDate() - 7);
  const to = new Date(year, month, 0);
  to.setDate(to.getDate() + 7);
  return {
    from: getDateKey(from),
    to: getDateKey(to),
  };
}

export function getCalendarWeeks(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  // Monday = 0, Sunday = 6
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const weeks: Date[][] = [];
  let current = new Date(firstDay);
  current.setDate(current.getDate() - startOffset);

  while (current <= lastDay || weeks.length < 6) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
    if (weeks.length >= 6) break;
  }

  return weeks;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}
