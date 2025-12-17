"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
  disabled?: boolean;
}

const variantStyles = {
  default: "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted-foreground)]/20",
  primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]",
  success: "bg-[var(--success)] text-white hover:opacity-90",
  warning: "bg-[var(--warning)] text-white hover:opacity-90",
  danger: "bg-[var(--destructive)] text-white hover:opacity-90",
};

const sizeStyles = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const iconSizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const IconButton = ({
  icon: Icon,
  onClick,
  variant = "default",
  size = "md",
  label,
  className,
  disabled = false,
}: IconButtonProps) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <Icon className={iconSizes[size]} />
    </motion.button>
  );
};

export { IconButton };
