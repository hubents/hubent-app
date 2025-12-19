"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { RiCheckLine } from "@remixicon/react";

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

interface DropdownMenuCheckboxItemProps extends DropdownMenuItemProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

interface DropdownMenuSeparatorProps {
  className?: string;
}

interface DropdownMenuLabelProps {
  children: React.ReactNode;
  className?: string;
}

const DropdownMenu = ({ trigger, children, align = "end", className }: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const alignClasses = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  };

  return (
    <div ref={menuRef} className="relative inline-block">
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={cn(
            "absolute z-[var(--z-dropdown)] mt-2 min-w-[180px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--popover)] p-1 shadow-[var(--shadow-md)] animate-in fade-in-0 zoom-in-95 duration-150",
            alignClasses[align],
            className
          )}
        >
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement<{ closeMenu?: () => void }>, {
                closeMenu: () => setIsOpen(false),
              });
            }
            return child;
          })}
        </div>
      )}
    </div>
  );
};

const DropdownMenuItem = ({
  children,
  onClick,
  disabled = false,
  destructive = false,
  className,
  icon,
  closeMenu,
}: DropdownMenuItemProps & { closeMenu?: () => void }) => (
  <button
    onClick={() => {
      if (!disabled) {
        onClick?.();
        closeMenu?.();
      }
    }}
    disabled={disabled}
    className={cn(
      "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm transition-colors",
      "focus:outline-none focus:bg-[var(--accent)]",
      disabled
        ? "cursor-not-allowed opacity-50"
        : destructive
        ? "text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
        : "hover:bg-[var(--accent)]",
      className
    )}
  >
    {icon && <span className="h-4 w-4">{icon}</span>}
    {children}
  </button>
);

const DropdownMenuCheckboxItem = ({
  children,
  checked = false,
  onCheckedChange,
  disabled = false,
  className,
  closeMenu,
}: DropdownMenuCheckboxItemProps & { closeMenu?: () => void }) => (
  <button
    onClick={() => {
      if (!disabled) {
        onCheckedChange?.(!checked);
      }
    }}
    disabled={disabled}
    className={cn(
      "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm transition-colors",
      "focus:outline-none focus:bg-[var(--accent)]",
      disabled ? "cursor-not-allowed opacity-50" : "hover:bg-[var(--accent)]",
      className
    )}
  >
    <span className="flex h-4 w-4 items-center justify-center">
      {checked && <RiCheckLine className="h-4 w-4 text-[var(--primary)]" />}
    </span>
    {children}
  </button>
);

const DropdownMenuSeparator = ({ className }: DropdownMenuSeparatorProps) => (
  <div className={cn("-mx-1 my-1 h-px bg-[var(--border)]", className)} />
);

const DropdownMenuLabel = ({ children, className }: DropdownMenuLabelProps) => (
  <div className={cn("px-2 py-1.5 text-xs font-semibold text-[var(--muted-foreground)]", className)}>
    {children}
  </div>
);

export {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
};
