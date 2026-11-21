"use client";

import { useEffect, useId, type ReactNode } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  maxWidthClass = "max-w-lg",
  children,
  footer,
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      data-testid="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1B1F]/60 p-3 sm:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          "w-full bg-surface border-2 border-[#001C26] max-h-[90vh] flex flex-col overflow-hidden",
          maxWidthClass,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6 shrink-0">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg sm:text-xl font-bold text-ink leading-snug"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-dark-gray">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 border border-border text-ink hover:bg-canvas-muted transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-border bg-canvas px-5 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
