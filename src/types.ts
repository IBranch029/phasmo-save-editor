/** Shared types between the React dashboard and the Rust backend. */

/** Metadata of a single automatic backup. */
export interface BackupInfo {
  path: string;
  name: string;
  sizeBytes: number;
  createdAt: string;
}

/** Description of the save folder and its contents. */
export interface SaveInfo {
  defaultDirectory: string;
  directory: string;
  savePath: string | null;
  exists: boolean;
  gameRunning: boolean;
  backups: BackupInfo[];
}

/** An integer field of the save file. */
export interface IntField {
  key: string;
  value: number;
}

/** A boolean field of the save file. */
export interface BoolField {
  key: string;
  value: boolean;
}

/** A floating point field of the save file. */
export interface FloatField {
  key: string;
  value: number;
}

/** Everything the dashboard needs to render a profile. */
export interface SaveProfile {
  path: string;
  sizeBytes: number;
  modifiedAt: string;
  saveVersion: number | null;
  money: number | null;
  experience: number | null;
  level: number | null;
  prestige: number | null;
  rewardMultiplier: number | null;
  prestigeTheme: boolean | null;
  ints: IntField[];
  bools: BoolField[];
  floats: FloatField[];
  totalFields: number;
}

/** The result of a successful write. */
export interface SaveOutcome {
  profile: SaveProfile;
  backupPath: string;
  bytesWritten: number;
}

/** The type of a value that can be written into the save file. */
export type PatchKind = "int" | "bool" | "float";

/** A single requested modification of a root field. */
export interface Patch {
  key: string;
  type: PatchKind;
  value: number | boolean;
}

/** Severity of a toast notification. */
export type ToastTone = "success" | "error" | "warning" | "info";

/** A toast notification. */
export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  detail?: string;
}

/** Lifecycle of the save file inside the application. */
export type SaveState =
  | "idle"
  | "detecting"
  | "loading"
  | "loaded"
  | "saving"
  | "error";
