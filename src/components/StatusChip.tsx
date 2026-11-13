import type { ReactNode } from "react";

export type ChipTone = "ok" | "warn" | "danger" | "info";

const TONE_CLASS: Record<ChipTone, string> = {
  ok: "chip-ok",
  warn: "chip-warn",
  danger: "chip-danger",
  info: "chip-info",
};

export interface StatusChipProps {
  tone?: ChipTone;
  children: ReactNode;
  className?: string;
  /** Adds a soft pulse to the status dot. */
  pulse?: boolean;
}

/** A small pill that communicates the state of a subsystem. */
export function StatusChip({ tone = "info", children, className = "", pulse = false }: StatusChipProps) {
  return (
    <span className={`chip ${TONE_CLASS[tone]} ${className}`}>
      <span className={`chip-dot ${pulse ? "animate-pulse" : ""}`} />
      {children}
    </span>
  );
}
