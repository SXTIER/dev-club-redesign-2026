"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "lime" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[#0038E1] text-white border-2 border-[#001C26] hover:bg-[#002BAA] active:bg-[#002288]",
  lime:
    "bg-[#A9E041] text-[#1C1B1F] border-2 border-[#001C26] hover:bg-[#97CE32] active:bg-[#86BC24]",
  secondary:
    "bg-surface text-ink border border-border hover:bg-canvas-muted active:bg-border",
  ghost:
    "bg-transparent text-ink border border-transparent hover:bg-canvas-muted active:bg-border",
  danger:
    "bg-[#FB4A2A] text-white border-2 border-[#001C26] hover:bg-[#B41B00] active:bg-[#8E1500]",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-11 sm:min-h-9 px-3 py-2 sm:py-1.5 text-sm",
  md: "min-h-11 px-5 py-2.5 text-sm sm:text-base",
  lg: "min-h-[52px] px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled,
  type = "button",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        "inline-flex max-w-full items-center justify-center gap-2 font-medium transition-colors whitespace-normal text-center select-none cursor-pointer",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
