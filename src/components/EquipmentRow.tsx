import {
  Aperture,
  AudioLines,
  BookOpen,
  Camera,
  CircleDot,
  Cross,
  Flame,
  Flashlight,
  Glasses,
  HardHat,
  Leaf,
  Mic,
  Package,
  Pill,
  Radar,
  Radio,
  Sparkles,
  SprayCan,
  Sun,
  Thermometer,
  Video,
  Wand2,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { EquipmentEntry } from "../lib/catalog";
import { MAX_INVENTORY, MAX_TIER } from "../lib/catalog";

const ICONS: Record<string, LucideIcon> = {
  EMFReader: Radio,
  Flashlight: Flashlight,
  UVFlashlight: Zap,
  StrongFlashlight: Sun,
  Camera: Camera,
  PhotoCamera: Camera,
  DSLRCamera: Aperture,
  VideoCamera: Video,
  HeadMountedCamera: Glasses,
  SpiritBox: Radio,
  UVLight: Zap,
  DOTSProjector: Radar,
  SoundSensor: AudioLines,
  MotionSensor: Radar,
  ParabolicMicrophone: Mic,
  SoundRecorder: AudioLines,
  Thermometer: Thermometer,
  GhostWritingBook: BookOpen,
  Crucifix: Cross,
  Salt: CircleDot,
  Sage: Leaf,
  Tripod: Aperture,
  Lighter: Flame,
  Firelight: Flame,
  Igniter: Flame,
  Candle: Flame,
  Glowstick: Wand2,
  Repellent: SprayCan,
  SanityPills: Pill,
  SanityMedication: Pill,
  HeadGear: HardHat,
};

export interface EquipmentRowProps {
  entry: EquipmentEntry;
  inventory: number;
  tier: number;
  unlocked: boolean;
  onFieldChange: (key: string, value: number | boolean) => void;
  disabled?: boolean;
}

/** A single piece of equipment with its quantity and tier controls. */
export function EquipmentRow({
  entry,
  inventory,
  tier,
  unlocked,
  onFieldChange,
  disabled,
}: EquipmentRowProps) {
  const Icon = ICONS[entry.base] ?? Package;

  const setTier = (next: number) => {
    if (entry.unlockKey) onFieldChange(entry.unlockKey, next >= 1);
    if (entry.tierKey) onFieldChange(entry.tierKey, next);
    // The game keeps the amount of every owned tier in its own counter.
    for (const slot of entry.tierSlots) {
      if (!slot.writable) continue;
      onFieldChange(slot.key, next >= slot.tier ? 1 : 0);
    }
  };

  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-ink-900/40 p-3 transition-colors hover:border-ember/25 hover:bg-ink-850/50 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border transition-colors ${
            unlocked
              ? "border-ember/30 bg-ember/10 text-emberBright"
              : "border-white/10 bg-white/[0.03] text-bone/35"
          }`}
        >
          <Icon size={18} strokeWidth={1.6} />
        </span>

        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-bone/90">{entry.label}</p>
          <p className="truncate text-[11px] text-bone/35">{entry.blurb}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Quantity */}
        {entry.inventoryKey ? (
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-ink-950/60 p-0.5">
            <button
              type="button"
              className="h-7 w-7 rounded-md text-bone/60 transition hover:bg-white/10 hover:text-bone disabled:opacity-30"
              disabled={disabled || inventory <= 0}
              aria-label={`Decrease ${entry.label}`}
              onClick={() => onFieldChange(entry.inventoryKey!, Math.max(0, inventory - 1))}
            >
              −
            </button>
            <span className="value-mono w-9 text-center text-[13px] text-bone/90">{inventory}</span>
            <button
              type="button"
              className="h-7 w-7 rounded-md text-bone/60 transition hover:bg-white/10 hover:text-bone disabled:opacity-30"
              disabled={disabled || inventory >= MAX_INVENTORY}
              aria-label={`Increase ${entry.label}`}
              onClick={() => onFieldChange(entry.inventoryKey!, Math.min(MAX_INVENTORY, inventory + 1))}
            >
              +
            </button>
          </div>
        ) : null}

        {/* Tier */}
        {entry.tierKey || entry.unlockKey ? (
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-ink-950/60 p-0.5">
            {Array.from({ length: MAX_TIER }, (_, index) => index + 1).map((level) => {
              const active = tier >= level;
              return (
                <button
                  key={level}
                  type="button"
                  disabled={disabled}
                  title={`Set tier ${level}`}
                  onClick={() => setTier(active && tier === level ? 0 : level)}
                  className={`h-7 rounded-md px-2 text-[10px] font-bold tracking-wider transition ${
                    active
                      ? "bg-ember/20 text-emberBright shadow-[inset_0_0_0_1px_rgba(229,154,69,0.4)]"
                      : "text-bone/35 hover:bg-white/[0.06] hover:text-bone/70"
                  }`}
                >
                  T{level}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Unlock toggle for items without a tier ladder */}
        {entry.unlockKey && !entry.tierKey ? (
          <button
            type="button"
            role="switch"
            aria-checked={unlocked}
            disabled={disabled}
            onClick={() => onFieldChange(entry.unlockKey!, !unlocked)}
            className={`flex h-8 items-center gap-2 rounded-lg border px-2.5 text-[10px] font-semibold uppercase tracking-wider2 transition ${
              unlocked
                ? "border-spirit/40 bg-spirit/10 text-spiritBright"
                : "border-white/10 bg-white/[0.03] text-bone/45"
            }`}
          >
            <Sparkles size={11} />
            {unlocked ? "Owned" : "Locked"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
