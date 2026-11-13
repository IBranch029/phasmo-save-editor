import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import { useEffect, useState } from "react";

/** The application mark: a glowing spirit box signal meter. */
function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="rgba(229,154,69,0.35)" strokeWidth="1" />
      <circle cx="12" cy="12" r="7.2" stroke="#e59a45" strokeWidth="1.6" />
      <rect x="8" y="12.2" width="2" height="3.6" rx="0.6" fill="#e59a45" opacity="0.65" />
      <rect x="11" y="9.4" width="2" height="6.4" rx="0.6" fill="#ffd9a8" />
      <rect x="14" y="11.2" width="2" height="4.6" rx="0.6" fill="#e59a45" opacity="0.65" />
      <rect x="7.4" y="16.4" width="9.2" height="0.9" rx="0.45" fill="#e59a45" opacity="0.8" />
    </svg>
  );
}

/** The custom title bar of the frameless window. */
export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;

    let appWindow: ReturnType<typeof getCurrentWindow>;
    try {
      appWindow = getCurrentWindow();
    } catch {
      // The component also renders in a plain browser during development.
      return;
    }

    appWindow
      .isMaximized()
      .then((value) => {
        if (!cancelled) setMaximized(value);
      })
      .catch(() => undefined);

    appWindow
      .onResized(() => {
        appWindow
          .isMaximized()
          .then((value) => {
            if (!cancelled) setMaximized(value);
          })
          .catch(() => undefined);
      })
      .then((unlisten) => {
        dispose = unlisten;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  const run = (action: () => Promise<unknown>) => {
    try {
      action().catch(() => undefined);
    } catch {
      /* the window controls are only available inside the shell */
    }
  };

  return (
    <header className="drag-region relative z-30 flex h-11 shrink-0 items-center gap-3 border-b border-white/[0.07] bg-ink-950/70 pl-4 backdrop-blur-md">
      <Logo />
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider3 text-bone/85">
          PhasmoSave
        </span>
        <span className="text-[11px] font-light uppercase tracking-wider3 text-ember/70">Editor</span>
      </div>

      <div className="mx-2 h-4 w-px bg-white/10" />

      <span className="text-[10px] uppercase tracking-wider2 text-bone/30">
        Local profile save editor
      </span>

      <div className="flex-1" />

      <div className="no-drag flex items-center gap-1 pr-2">
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Minimise"
          onClick={() => run(() => getCurrentWindow().minimize())}
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label={maximized ? "Restore" : "Maximise"}
          onClick={() => run(() => getCurrentWindow().toggleMaximize())}
        >
          <Square size={12} className={maximized ? "opacity-50" : ""} />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-icon hover:!border-rust/50 hover:!bg-rust/20 hover:!text-rustBright"
          aria-label="Close"
          onClick={() => run(() => getCurrentWindow().close())}
        >
          <X size={15} />
        </button>
      </div>
    </header>
  );
}
