"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";

interface CalendarProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  className?: string;
  highlightedDates?: Date[];
}

const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const Calendar = ({ selectedDate, onDateSelect, className, highlightedDates = [] }: CalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = (firstDay.getDay() + 6) % 7; // Monday = 0

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isHighlighted = (day: number) => {
    return highlightedDates.some(date => 
      day === date.getDate() &&
      currentMonth.getMonth() === date.getMonth() &&
      currentMonth.getFullYear() === date.getFullYear()
    );
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onDateSelect?.(newDate);
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className={cn("w-full max-w-sm rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4", className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="rounded-[var(--radius)] p-1.5 transition-colors hover:bg-[var(--muted)]"
        >
          <RiArrowLeftSLine className="h-5 w-5" />
        </button>
        <span className="font-semibold">
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button
          onClick={nextMonth}
          className="rounded-[var(--radius)] p-1.5 transition-colors hover:bg-[var(--muted)]"
        >
          <RiArrowRightSLine className="h-5 w-5" />
        </button>
      </div>

      {/* Days Header */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {DAYS.map((day, i) => (
          <div key={i} className="py-2 text-center text-xs font-medium text-[var(--muted-foreground)]">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => (
          <div key={i} className="aspect-square">
            {day && (
              <button
                onClick={() => handleDateClick(day)}
                className={cn(
                  "flex h-full w-full items-center justify-center rounded-full text-sm transition-all",
                  isToday(day) && !isSelected(day) && "bg-[var(--primary)]/10 font-semibold text-[var(--primary)]",
                  isSelected(day) && "bg-[var(--primary)] text-white font-semibold",
                  isHighlighted(day) && !isSelected(day) && "bg-[var(--success)]/20 text-[var(--success)]",
                  !isToday(day) && !isSelected(day) && !isHighlighted(day) && "hover:bg-[var(--muted)]"
                )}
              >
                {day}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export { Calendar };
