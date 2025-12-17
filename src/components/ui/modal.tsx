"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { RiCloseLine } from "@remixicon/react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
}

interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface ModalTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface ModalDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

const Modal = ({ open, onClose, children, className }: ModalProps) => {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={onClose}
      />
      {/* Modal */}
      <div
        className={cn(
          "relative z-10 w-full max-w-lg mx-4 bg-[var(--card)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xl)] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-200",
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-[var(--radius)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          <RiCloseLine className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
};

const ModalContent = ({ children, className }: ModalContentProps) => (
  <div className={cn("p-6", className)}>{children}</div>
);

const ModalHeader = ({ children, className }: ModalHeaderProps) => (
  <div className={cn("space-y-1.5 pr-8", className)}>{children}</div>
);

const ModalTitle = ({ children, className }: ModalTitleProps) => (
  <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
    {children}
  </h2>
);

const ModalDescription = ({ children, className }: ModalDescriptionProps) => (
  <p className={cn("text-sm text-[var(--muted-foreground)]", className)}>{children}</p>
);

const ModalFooter = ({ children, className }: ModalFooterProps) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t border-[var(--border)] p-4 bg-[var(--muted)]/50 rounded-b-[var(--radius-lg)]",
      className
    )}
  >
    {children}
  </div>
);

export { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter };
