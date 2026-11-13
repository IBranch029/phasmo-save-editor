import { motion } from "framer-motion";
import { Archive, Loader2, RotateCcw, Save, ShieldCheck } from "lucide-react";

export interface ActionBarProps {
  modifiedCount: number;
  saving: boolean;
  canSave: boolean;
  gameRunning: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onBackup: () => void;
}

/** The sticky footer with the primary write action. */
export function ActionBar({
  modifiedCount,
  saving,
  canSave,
  gameRunning,
  onSave,
  onDiscard,
  onBackup,
}: ActionBarProps) {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="sticky bottom-0 z-20 flex flex-wrap items-center gap-4 border-t border-white/[0.07] bg-ink-950/85 px-6 py-4 backdrop-blur-xl"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${
            modifiedCount > 0
              ? "border-ember/40 bg-ember/10 text-emberBright"
              : "border-spirit/25 bg-spirit/10 text-spiritBright"
          }`}
        >
          <ShieldCheck size={16} />
        </span>

        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-wider2 text-bone/80">
            {modifiedCount > 0
              ? `${modifiedCount} change${modifiedCount === 1 ? "" : "s"} pending`
              : "Save file is in sync"}
          </p>
          <p className="truncate text-[11px] text-bone/35">
            {gameRunning
              ? "Phasmophobia is running - close the game before writing."
              : "A timestamped backup is created before the file is replaced."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn" onClick={onBackup} disabled={saving || !canSave}>
          <Archive size={13} />
          Backup now
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={onDiscard}
          disabled={saving || modifiedCount === 0}
        >
          <RotateCcw size={13} />
          Discard
        </button>

        <button
          type="button"
          className="btn btn-primary px-6 py-2.5 text-[12px]"
          onClick={onSave}
          disabled={saving || !canSave || modifiedCount === 0}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin-slow" />
              Encrypting...
            </>
          ) : (
            <>
              <Save size={14} />
              Save &amp; Encrypt
            </>
          )}
        </button>
      </div>
    </motion.footer>
  );
}
