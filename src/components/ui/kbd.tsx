import { cn } from "@/lib/utils";

interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

const Kbd = ({ children, className }: KbdProps) => {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-mono font-medium",
        "bg-[var(--muted)] border border-[var(--border)] rounded-[var(--radius-sm)]",
        "text-[var(--muted-foreground)]",
        className
      )}
    >
      {children}
    </kbd>
  );
};

export { Kbd };
