import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { Toast, ToastTone } from "../types";

const TONE: Record<ToastTone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "border-spirit/40 bg-spirit/10 text-spiritBright" },
  error: { icon: XCircle, className: "border-rust/50 bg-rust/10 text-rustBright" },
  warning: { icon: AlertTriangle, className: "border-ember/50 bg-ember/10 text-emberBright" },
  info: { icon: Info, className: "border-white/15 bg-white/[0.06] text-bone/80" },
};

export interface ToastsProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

/** The stack of notifications in the bottom right corner. */
export function Toasts({ toasts, onDismiss }: ToastsProps) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[22rem] flex-col gap-2.5">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const tone = TONE[toast.tone];
          const Icon = tone.icon;
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 48, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 48, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-panel backdrop-blur-md ${tone.className}`}
            >
              <Icon size={17} className="mt-0.5 shrink-0" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider2">{toast.title}</p>
                {toast.detail ? (
                  <p className="mt-1 break-words text-[11px] leading-relaxed text-bone/60">
                    {toast.detail}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 rounded p-0.5 text-bone/40 transition hover:text-bone"
                aria-label="Dismiss notification"
              >
                <XCircle size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
