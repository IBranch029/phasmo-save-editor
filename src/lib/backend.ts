import { invoke } from "@tauri-apps/api/core";

import type {
  BackupInfo,
  Patch,
  SaveInfo,
  SaveOutcome,
  SaveProfile,
} from "../types";

/**
 * Tauri rejects with the serialised error message. Depending on the platform
 * it arrives either as a plain string or wrapped into an object, so both
 * shapes are normalised into a readable sentence.
 */
function normalizeError(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "an unexpected error occurred";
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

/** Thin, typed wrapper around the Rust command surface. */
export const backend = {
  /** Locates the save folder and reports what is inside it. */
  detectSave(directory?: string): Promise<SaveInfo> {
    return call<SaveInfo>("detect_save", { directory: directory ?? null });
  },

  /** Decrypts the save file and returns the editable profile. */
  loadSave(path: string): Promise<SaveProfile> {
    return call<SaveProfile>("load_save", { path });
  },

  /** Applies the modifications, backs the save up and writes it back. */
  applyModifications(
    path: string,
    patches: Patch[],
    force = false,
  ): Promise<SaveOutcome> {
    return call<SaveOutcome>("apply_modifications", { path, patches, force });
  },

  /** Creates a timestamped backup of the save file. */
  createBackup(path: string): Promise<string> {
    return call<string>("create_backup", { path });
  },

  /** Lists every automatic backup of the save file. */
  listBackups(path: string): Promise<BackupInfo[]> {
    return call<BackupInfo[]>("list_backups", { path });
  },

  /** Restores a backup over the current save file. */
  restoreBackup(path: string, backup: string): Promise<SaveProfile> {
    return call<SaveProfile>("restore_backup", { path, backup });
  },

  /** Reports whether the game is currently running. */
  gameRunning(): Promise<boolean> {
    return call<boolean>("game_running");
  },
};
