import { motion } from "framer-motion";
import { Loader2, Radio, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { confirm, open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";

import { ActionBar } from "./components/ActionBar";
import { Backdrop } from "./components/Backdrop";
import { BackupDrawer } from "./components/BackupDrawer";
import { EquipmentCard } from "./components/EquipmentCard";
import { Header } from "./components/Header";
import { LevelCard } from "./components/LevelCard";
import { MoneyCard } from "./components/MoneyCard";
import { PrestigeCard } from "./components/PrestigeCard";
import { TitleBar } from "./components/TitleBar";
import { Toasts } from "./components/Toasts";
import { backend } from "./lib/backend";
import type {
  BackupInfo,
  Patch,
  SaveInfo,
  SaveProfile,
  SaveState,
  Toast,
  ToastTone,
} from "./types";

const FIELD_MONEY = "PlayersMoney";
const FIELD_LEVEL = "NewLevel";
const FIELD_EXPERIENCE = "Experience";
const FIELD_PRESTIGE = "PrestigeIndex";
const FIELD_PRESTIGE_THEME = "PrestigeTheme";

/** Builds the editable value map from a freshly loaded profile. */
function initialValues(profile: SaveProfile): Record<string, number | boolean> {
  const values: Record<string, number | boolean> = {};
  for (const field of profile.ints) values[field.key] = field.value;
  for (const field of profile.bools) values[field.key] = field.value;
  return values;
}

export default function App() {
  const [info, setInfo] = useState<SaveInfo | null>(null);
  const [profile, setProfile] = useState<SaveProfile | null>(null);
  const [values, setValues] = useState<Record<string, number | boolean>>({});
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toastId = useRef(0);

  const pushToast = useCallback((tone: ToastTone, title: string, detail?: string) => {
    toastId.current += 1;
    const id = `toast-${toastId.current}`;
    setToasts((current) => [...current, { id, tone, title, detail }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const refreshBackups = useCallback(async (path: string) => {
    try {
      setBackups(await backend.listBackups(path));
    } catch {
      /* the backup list is informational only */
    }
  }, []);

  const loadProfile = useCallback(
    async (path: string) => {
      setState("loading");
      setError(null);
      try {
        const loaded = await backend.loadSave(path);
        setProfile(loaded);
        setValues(initialValues(loaded));
        setState("loaded");
        await refreshBackups(path);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        setError(message);
        setState("error");
        pushToast("error", "Could not read the save file", message);
      }
    },
    [pushToast, refreshBackups],
  );

  const detect = useCallback(
    async (directory?: string) => {
      setState("detecting");
      try {
        const detected = await backend.detectSave(directory);
        setInfo(detected);
        setBackups(detected.backups);

        if (detected.savePath) {
          await loadProfile(detected.savePath);
        } else {
          setProfile(null);
          setValues({});
          setState("loaded");
          setError(
            `No SaveFile.txt was found in ${detected.directory}. Point the editor at the folder that contains it.`,
          );
        }
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        setError(message);
        setState("error");
        pushToast("error", "Detection failed", message);
      }
    },
    [loadProfile, pushToast],
  );

  useEffect(() => {
    void detect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  /** The difference between the loaded profile and the current edits. */
  const patches = useMemo<Patch[]>(() => {
    if (!profile) return [];
    const result: Patch[] = [];

    for (const field of profile.ints) {
      const current = values[field.key];
      if (typeof current === "number" && current !== field.value) {
        result.push({ key: field.key, type: "int", value: current });
      }
    }

    for (const field of profile.bools) {
      const current = values[field.key];
      if (typeof current === "boolean" && current !== field.value) {
        result.push({ key: field.key, type: "bool", value: current });
      }
    }

    return result;
  }, [profile, values]);

  const setField = useCallback((key: string, value: number | boolean) => {
    setValues((current) => ({ ...current, [key]: value }));
  }, []);

  const handleSave = useCallback(
    async (force = false) => {
      if (!profile || patches.length === 0) return;
      setState("saving");
      setError(null);

      try {
        const outcome = await backend.applyModifications(profile.path, patches, force);
        setProfile(outcome.profile);
        setValues(initialValues(outcome.profile));
        setState("loaded");
        await refreshBackups(outcome.profile.path);
        pushToast(
          "success",
          "Saved Successfully",
          `Encrypted ${outcome.bytesWritten} bytes. Backup: ${outcome.backupPath}`,
        );
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        setState("loaded");

        if (message.toLowerCase().includes("currently running") && !force) {
          const confirmed = await confirm(
            "Phasmophobia is running and will overwrite your save when it closes. Close the game and try again?",
            { title: "Game is still running", kind: "warning" },
          );
          if (confirmed) {
            await handleSave(true);
            return;
          }
          pushToast("warning", "Write cancelled", "Phasmophobia is still running.");
          return;
        }

        setError(message);
        pushToast("error", "Save failed", message);
      }
    },
    [profile, patches, pushToast, refreshBackups],
  );

  const handleBackup = useCallback(async () => {
    if (!profile) return;
    try {
      const backup = await backend.createBackup(profile.path);
      await refreshBackups(profile.path);
      pushToast("success", "Backup Created", backup);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      pushToast("error", "Backup failed", message);
    }
  }, [profile, pushToast, refreshBackups]);


  const handleRestore = useCallback(
    async (backup: BackupInfo) => {
      if (!profile) return;
      const confirmed = await confirm(
        `Restore "${backup.name}"? The current save is backed up before it is replaced.`,
        { title: "Restore backup", kind: "warning" },
      );
      if (!confirmed) return;

      try {
        const restored = await backend.restoreBackup(profile.path, backup.path);
        setProfile(restored);
        setValues(initialValues(restored));
        await refreshBackups(restored.path);
        pushToast("success", "Backup restored", backup.name);
        setDrawerOpen(false);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        pushToast("error", "Restore failed", message);
      }
    },
    [profile, pushToast, refreshBackups],
  );

  const handlePickFolder = useCallback(async () => {
    try {
      const picked = await open({
        directory: true,
        multiple: false,
        defaultPath: info?.directory,
        title: "Select the Phasmophobia data folder",
      });
      if (typeof picked === "string" && picked.length > 0) {
        await detect(picked);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      pushToast("error", "Could not open the folder picker", message);
    }
  }, [detect, info?.directory, pushToast]);

  const handleOpenFolder = useCallback(async () => {
    if (!info?.directory) return;
    try {
      await openPath(info.directory);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      pushToast("error", "Could not open the folder", message);
    }
  }, [info?.directory, pushToast]);

  const busy = state === "loading" || state === "detecting" || state === "saving";
  const money = Number(values[FIELD_MONEY] ?? 0);
  const level = Number(values[FIELD_LEVEL] ?? 1);
  const experience = Number(values[FIELD_EXPERIENCE] ?? 0);
  const prestige = Number(values[FIELD_PRESTIGE] ?? 0);
  const prestigeTheme = Boolean(values[FIELD_PRESTIGE_THEME]);

  const originalMoney = profile?.money ?? 0;
  const originalLevel = profile?.level ?? 1;
  const originalExperience = profile?.experience ?? 0;
  const originalPrestige = profile?.prestige ?? 0;

  return (
    <div className="relative flex h-full flex-col">
      <Backdrop />
      <TitleBar />

      <Header
        info={info}
        profile={profile}
        busy={busy}
        backupCount={backups.length}
        onReload={() => {
          if (profile) void loadProfile(profile.path);
        }}
        onPickFolder={() => void handlePickFolder()}
        onOpenFolder={() => void handleOpenFolder()}
        onOpenBackups={() => setDrawerOpen(true)}
      />

      <main className="relative z-10 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-[1560px] flex-col gap-5">
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 rounded-xl border border-rust/35 bg-rust/10 px-4 py-3"
            >
              <TriangleAlert size={16} className="mt-0.5 shrink-0 text-rustBright" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider2 text-rustBright">
                  Something went wrong
                </p>
                <p className="mt-1 break-words text-[12px] leading-relaxed text-bone/70">
                  {error}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setError(null)}
                aria-label="Dismiss the error"
              >
                ×
              </button>
            </motion.div>
          ) : null}

          {state === "detecting" || state === "loading" ? (
            <div className="flex flex-col items-center justify-center gap-4 py-32">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
                className="grid h-14 w-14 place-items-center rounded-full border border-ember/30 text-emberBright"
              >
                <Radio size={22} strokeWidth={1.6} />
              </motion.span>
              <p className="eyebrow">Decrypting the save file...</p>
            </div>
          ) : null}

          {profile ? (
            <>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)_minmax(0,1fr)]">
                <MoneyCard
                  value={money}
                  original={originalMoney}
                  onChange={(value) => setField(FIELD_MONEY, value)}
                  disabled={state === "saving"}
                />

                <LevelCard
                  level={level}
                  originalLevel={originalLevel}
                  experience={experience}
                  originalExperience={originalExperience}
                  onLevelChange={(value) => setField(FIELD_LEVEL, value)}
                  onExperienceChange={(value) => setField(FIELD_EXPERIENCE, value)}
                  disabled={state === "saving"}
                />

                <PrestigeCard
                  prestige={prestige}
                  original={originalPrestige}
                  rewardMultiplier={profile.rewardMultiplier}
                  prestigeTheme={prestigeTheme}
                  onPrestigeChange={(value) => setField(FIELD_PRESTIGE, value)}
                  onPrestigeThemeChange={(value) => setField(FIELD_PRESTIGE_THEME, value)}
                  disabled={state === "saving"}
                />
              </div>

              <EquipmentCard
                profile={profile}
                values={values}
                onFieldChange={setField}
                disabled={state === "saving"}
              />
            </>
          ) : null}

          {state === "idle" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-32 text-bone/30">
              <Loader2 size={22} className="animate-spin-slow" />
              <p className="eyebrow">Starting up...</p>
            </div>
          ) : null}
        </div>
      </main>

      <ActionBar
        modifiedCount={patches.length}
        saving={state === "saving"}
        canSave={profile !== null}
        gameRunning={info?.gameRunning ?? false}
        onSave={() => void handleSave()}
        onDiscard={() => {
          if (profile) setValues(initialValues(profile));
        }}
        onBackup={() => void handleBackup()}
      />

      <BackupDrawer
        open={drawerOpen}
        backups={backups}
        busy={state === "saving"}
        onClose={() => setDrawerOpen(false)}
        onRestore={(backup) => void handleRestore(backup)}
        onCreate={() => void handleBackup()}
      />

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

