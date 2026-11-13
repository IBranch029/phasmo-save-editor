import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface CardProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  accent?: "ember" | "spirit" | "moss" | "rust";
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  delay?: number;
}

const ACCENT: Record<NonNullable<CardProps["accent"]>, { icon: string; ring: string }> = {
  ember: { icon: "bg-ember/10 text-emberBright border-ember/25", ring: "from-ember/12" },
  spirit: { icon: "bg-spirit/10 text-spiritBright border-spirit/25", ring: "from-spirit/10" },
  moss: { icon: "bg-moss/10 text-moss border-moss/25", ring: "from-moss/10" },
  rust: { icon: "bg-rust/10 text-rustBright border-rust/25", ring: "from-rust/10" },
};

/** A titled dashboard panel with a soft accent glow in the top corner. */
export function Card({
  icon: Icon,
  title,
  subtitle,
  accent = "ember",
  actions,
  children,
  className = "",
  delay = 0,
}: CardProps) {
  const palette = ACCENT[accent];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`panel panel-hover overflow-hidden ${className}`}
    >
      {/* Corner glow */}
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${palette.ring} to-transparent blur-2xl`}
      />

      <header className="relative flex items-start gap-3 border-b border-white/[0.06] px-5 py-4">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${palette.icon}`}
        >
          <Icon size={17} strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider2 text-bone/90">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[11px] text-bone/40">{subtitle}</p>
          ) : null}
        </div>

        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>

      <div className="relative px-5 py-5">{children}</div>
    </motion.section>
  );
}
