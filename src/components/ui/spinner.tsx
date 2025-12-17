import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "default" | "dots";
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

const Spinner = ({ size = "md", className, variant = "default" }: SpinnerProps) => {
  if (variant === "dots") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <div className={cn("loading-dot rounded-full bg-[var(--primary)]", size === "sm" ? "h-1.5 w-1.5" : size === "lg" ? "h-3 w-3" : "h-2 w-2")} />
        <div className={cn("loading-dot rounded-full bg-[var(--primary)]", size === "sm" ? "h-1.5 w-1.5" : size === "lg" ? "h-3 w-3" : "h-2 w-2")} />
        <div className={cn("loading-dot rounded-full bg-[var(--primary)]", size === "sm" ? "h-1.5 w-1.5" : size === "lg" ? "h-3 w-3" : "h-2 w-2")} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size === "sm" ? "16px" : size === "lg" ? "32px" : "24px",
        height: size === "sm" ? "16px" : size === "lg" ? "32px" : "24px",
        border: `${size === "lg" ? "3px" : "2px"} solid var(--primary)`,
        borderTopColor: "transparent",
        borderRadius: "50%",
      }}
      className={cn("animate-spin", className)}
    />
  );
};

export { Spinner };
