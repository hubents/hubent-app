"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AIChatBase } from "@/components/ai/ai-chat-base";
import { Sparkles } from "lucide-react";

interface Task {
  id: number;
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  category?: string | null;
  dueDate?: string | null;
}

interface TaskAIDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  taskId: number | null;
}

export function TaskAIDrawer({ open, onOpenChange, task, taskId }: TaskAIDrawerProps) {
  const context = taskId ? `task:${taskId}` : "task";
  
  const suggestions = [
    "Resume esta tarea",
    "¿Quién está asignado?",
    "Genera subtareas",
    "¿Cuál es el estado actual?",
  ];

  const taskInfo = task ? `Tarea: ${task.title}` : "Tarea";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md p-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader className="px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-left">Enti</SheetTitle>
              <p className="text-xs text-[var(--muted-foreground)] truncate">{taskInfo}</p>
            </div>
          </div>
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden">
          <AIChatBase
            context={context}
            suggestions={suggestions}
            showHeader={false}
            className="h-full"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
