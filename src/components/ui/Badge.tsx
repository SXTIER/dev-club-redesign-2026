import type { ReactNode } from "react";

export type BadgeTone =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "teal";

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  info: "bg-info-bg text-info-text border border-primary/20",
  success: "bg-success-bg text-success-text border border-success-accent/50",
  warning: "bg-warning-bg text-warning-text border border-warning-accent/50",
  danger: "bg-danger-bg text-danger-text border border-danger-border/40",
  neutral: "bg-canvas-muted text-dark-gray border border-border",
  teal: "bg-turquoise-bg text-turquoise-text border border-turquoise-base/50",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold leading-none whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
