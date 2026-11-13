import { motion } from "framer-motion";
import { FolderOpen, History, RefreshCw, ShieldAlert } from "lucide-react";

import { formatBytes, shortenPath } from "../lib/format";
import type { SaveInfo, SaveProfile } from "../types";
import { StatusChip } from "./StatusChip";

export interface HeaderProps {
  info: SaveInfo | null;
  profile: SaveProfile | null;
  busy: boolean;
  backupCount: number;
  onReload: () => void;
  onPickFolder: () => void;
  onOpenFolder: () => void;
  onOpenBackups: () => void;
}

/** The overview bar: profile identity, save location and live status. */
export function Header({
  info,
  profile,
  busy,
  backupCount,
  onReload,
  onPickFolder,
  onOpenFolder,
  onOpenBackups,
}: HeaderProps) {
  const running = info?.gameRunning ?? false;

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-20 flex flex-wrap items-center gap-4 border-b border-white/[0.06] bg-ink-950/40 px-6 py-4 backdrop-blur-sm"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-base font-semibold tracking-tight text-bone/95">Profile Overview</h1>
          <span className="h-3.5 w-px bg-white/10" />
          <span className="text-[11px] uppercase tracking-wider2 text-bone/35">
            {profile ? `${profile.totalFields} fields decoded` : "no profile loaded"}
          </span>
        </div>

        <p
          className="mt-1 truncate font-mono text-[11px] text-bone/35"
          title={info?.directory ?? undefined}
        >
          {info?.directory ?? "resolving save folder..."}
          {profile ? ` · ${formatBytes(profile.sizeBytes)}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {running ? (
          <StatusChip tone="danger" pulse>
            <ShieldAlert size={11} /> Game running
          </StatusChip>
        ) : null}

        {profile ? (
          <StatusChip tone="ok" pulse>
            Save Loaded
          </StatusChip>
        ) : (
          <StatusChip tone="info">Idle</StatusChip>
        )}

        <StatusChip tone="info">
          <span className="h-1.5 w-1.5 rounded-full bg-spirit" />
          Encrypted
        </StatusChip>

        <div className="ml-1 flex items-center gap-1.5">
          <button
            type="button"
            className="btn relative"
            onClick={onOpenBackups}
            disabled={!profile}
            title="Open the backup archive"
          >
            <History size={13} />
            Backups
            {backupCount > 0 ? (
              <span className="value-mono ml-1 rounded bg-ember/15 px-1.5 py-0.5 text-[10px] text-emberBright">
                {backupCount}
              </span>
            ) : null}
          </button>
          <button type="button" className="btn" onClick={onPickFolder} disabled={busy}>
            <FolderOpen size={13} /> Folder
          </button>
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Open save folder in Explorer"
            title="Open the save folder in Explorer"
            onClick={onOpenFolder}
            disabled={!profile}
          >
            <FolderOpen size={13} />
          </button>
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Reload save"
            title="Reload the save file"
            onClick={onReload}
            disabled={busy}
          >
            <RefreshCw size={13} className={busy ? "animate-spin-slow" : ""} />
          </button>
        </div>
      </div>

      {info ? (
        <p className="w-full text-[10px] uppercase tracking-wider2 text-bone/20">
          {shortenPath(info.savePath ?? info.directory, 96)}
        </p>
      ) : null}
    </motion.header>
  );
}
