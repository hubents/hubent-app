import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiInformationLine,
  RiAlertLine,
  RiCloseLine,
} from "@remixicon/react";

const alertVariants = cva(
  "relative w-full rounded-[var(--radius-lg)] border p-4 transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]",
        success: "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200",
        warning: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200",
        error: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200",
        info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const iconMap = {
  default: RiInformationLine,
  success: RiCheckboxCircleLine,
  warning: RiAlertLine,
  error: RiErrorWarningLine,
  info: RiInformationLine,
};

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", title, children, dismissible, onDismiss, ...props }, ref) => {
    const Icon = iconMap[variant || "default"];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <div className="flex gap-3">
          <Icon className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            {title && <h5 className="font-medium mb-1">{title}</h5>}
            <div className="text-sm opacity-90">{children}</div>
          </div>
          {dismissible && (
            <button
              onClick={onDismiss}
              className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            >
              <RiCloseLine className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = "Alert";

export { Alert, alertVariants };
