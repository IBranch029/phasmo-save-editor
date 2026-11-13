import { AnimatePresence, motion } from "framer-motion";
import { Archive, ArchiveRestore, History, X } from "lucide-react";

import { formatBytes, formatStamp } from "../lib/format";
import type { BackupInfo } from "../types";

export interface BackupDrawerProps {
  open: boolean;
  backups: BackupInfo[];
  busy: boolean;
  onClose: () => void;
  onRestore: (backup: BackupInfo) => void;
  onCreate: () => void;
}

/** A slide over panel that lists the automatic backups of the save file. */
export function BackupDrawer({ open, backups, busy, onClose, onRestore, onCreate }: BackupDrawerProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 z-50 flex h-full w-[26rem] flex-col border-l border-white/10 bg-ink-900/95 shadow-panel backdrop-blur-xl"
          >
            <header className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
              <History size={16} className="text-emberBright" />
              <div className="flex-1">
                <h2 className="text-[13px] font-semibold uppercase tracking-wider2 text-bone/90">
                  Backup archive
                </h2>
                <p className="text-[11px] text-bone/35">
                  {backups.length} automatic backup{backups.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={onClose}
                aria-label="Close the backup archive"
              >
                <X size={15} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {backups.length === 0 ? (
                <p className="py-12 text-center text-[12px] text-bone/30">
                  No backups yet. One is created automatically before every write.
                </p>
              ) : (
                <div className="space-y-2">
                  {backups.map((backup) => (
                    <div
                      key={backup.path}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-ink-950/50 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[11px] text-bone/75">
                          {backup.name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-bone/30">
                          {formatStamp(backup.createdAt)} · {formatBytes(backup.sizeBytes)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn px-2.5 py-1.5 text-[10px]"
                        disabled={busy}
                        onClick={() => onRestore(backup)}
                      >
                        <ArchiveRestore size={11} />
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <footer className="border-t border-white/[0.07] px-5 py-4">
              <button
                type="button"
                className="btn w-full"
                onClick={onCreate}
                disabled={busy}
              >
                <Archive size={13} />
                Create a backup now
              </button>
            </footer>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
