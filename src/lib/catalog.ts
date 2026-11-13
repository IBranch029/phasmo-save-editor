import type { SaveProfile } from "../types";

/** The kind of equipment an entry belongs to. */
export type GearCategory = "gear" | "tool" | "consumable" | "cosmetic";

/** Presentation metadata for a piece of equipment. */
export interface GearMeta {
  label: string;
  category: GearCategory;
  blurb: string;
}

/**
 * Display metadata for the equipment shipped with the game.
 *
 * The catalogue is only used for presentation: the actual list of items is
 * derived from the fields that are present in the save file, so equipment
 * added by a future game update still shows up.
 */
export const GEAR_CATALOGUE: Record<string, GearMeta> = {
  EMFReader: { label: "EMF Reader", category: "gear", blurb: "Five levels of electromagnetic activity." },
  Flashlight: { label: "Flashlight", category: "gear", blurb: "The classic light source." },
  UVFlashlight: { label: "UV Flashlight", category: "gear", blurb: "Reveals fingerprints and spirit trails." },
  StrongFlashlight: { label: "Strong Flashlight", category: "gear", blurb: "A brighter beam for the deep dark." },
  Camera: { label: "Photo Camera", category: "gear", blurb: "Legacy camera with a wide flash." },
  PhotoCamera: { label: "Photo Camera", category: "gear", blurb: "Capture the moment of the haunting." },
  DSLRCamera: { label: "DSLR Camera", category: "gear", blurb: "High resolution photographs." },
  VideoCamera: { label: "Video Camera", category: "gear", blurb: "Record paranormal activity on tape." },
  HeadMountedCamera: { label: "Head-Mounted Camera", category: "gear", blurb: "Hands free video evidence." },
  SpiritBox: { label: "Spirit Box", category: "gear", blurb: "Tune in to the voices on the radio." },
  UVLight: { label: "UV Light", category: "gear", blurb: "Makes hidden traces glow." },
  EVPRecorder: { label: "EVP Recorder", category: "gear", blurb: "Captures the voices of the dead." },
  DOTSProjector: { label: "D.O.T.S Projector", category: "gear", blurb: "Projects a grid of laser dots." },
  SoundSensor: { label: "Sound Sensor", category: "gear", blurb: "Detects whispers in the silence." },
  MotionSensor: { label: "Motion Sensor", category: "gear", blurb: "Fires when something moves." },
  ParabolicMicrophone: { label: "Parabolic Microphone", category: "gear", blurb: "Amplifies distant whispers." },
  SoundRecorder: { label: "Sound Recorder", category: "gear", blurb: "Stores every sound it hears." },
  Thermometer: { label: "Thermometer", category: "tool", blurb: "Cold spots mean something is close." },
  GhostWritingBook: { label: "Ghost Writing Book", category: "tool", blurb: "Spirits write on their own." },
  Crucifix: { label: "Crucifix", category: "tool", blurb: "Protects the living from the dead." },
  Salt: { label: "Salt", category: "tool", blurb: "Slows down a ghost on the hunt." },
  Sage: { label: "Sage", category: "tool", blurb: "Burns to reveal a spirit's presence." },
  Tripod: { label: "Tripod", category: "tool", blurb: "Keeps the camera steady in the dark." },
  Lighter: { label: "Lighter", category: "tool", blurb: "A small flame that never dies." },
  Firelight: { label: "Firelight", category: "tool", blurb: "Burns brightly and reveals ghosts." },
  Igniter: { label: "Igniter", category: "tool", blurb: "Reveals ghosts in the dark." },
  Candle: { label: "Candle", category: "consumable", blurb: "A steady flame for dark rooms." },
  Glowstick: { label: "Glowstick", category: "consumable", blurb: "Lasts until the hunt is over." },
  Repellent: { label: "Repellent", category: "consumable", blurb: "Slows a ghost that is inside you." },
  SanityPills: { label: "Sanity Pills", category: "consumable", blurb: "Restores a little sanity." },
  SanityMedication: { label: "Sanity Medication", category: "consumable", blurb: "Heavy duty sanity medicine." },
  HeadGear: { label: "Head Gear", category: "cosmetic", blurb: "Helmets, caps and other head wear." },
};

/** The order the categories are shown in. */
export const CATEGORY_ORDER: GearCategory[] = ["gear", "tool", "consumable", "cosmetic"];


/**
 * The two per tier ownership counters the game stores for every item.
 *
 * The game names them `<Item>0Tier` and `<Item>-1Tier`; the counters describe
 * whether tier one and tier two of the item are owned.
 */
export const TIER_SLOT_SUFFIXES = ["0Tier", "-1Tier"] as const;

/** The tier that a per tier ownership counter belongs to. */
export const TIER_SLOT_TIER: Record<string, number> = { "0Tier": 1, "-1Tier": 2 };

/** A single equipment entry derived from the save file. */
export interface EquipmentEntry {
  /** The ES3 base name, e.g. `SpiritBox`. */
  base: string;
  label: string;
  category: GearCategory;
  blurb: string;
  /** The inventory counter, when the item can be carried. */
  inventoryKey: string | null;
  inventory: number;
  /** The current tier, when the item can be upgraded. */
  tierKey: string | null;
  tier: number;
  /** Whether the first tier is owned. */
  unlockKey: string | null;
  unlocked: boolean;
  /** The per tier ownership counters (`<Item>0Tier`, `<Item>-1Tier`). */
  tierSlots: { key: string; tier: number; value: number }[];
}

/** The maximum tier the game supports. */
export const MAX_TIER = 3;

/** The maximum prestige level the game supports (v0.17+). */
export const MAX_PRESTIGE = 3999;

/** The highest level the game accepts. */
export const MAX_LEVEL = 9999;

/** The largest amount of money the game accepts. */
export const MAX_MONEY = 999_999_999;

/** The largest inventory stack the game accepts. */
export const MAX_INVENTORY = 99;

/**
 * Turns an ES3 field name into something a human can read.
 *
 * `EMFReaderInventory` becomes `EMF Reader` and `DOTSProjectorTier` becomes
 * `DOTSProjector Tier`.
 */
export function prettifyKey(key: string): string {
  const trimmed = key
    .replace(/Inventory$/, "")
    .replace(/TierOneUnlockOwned$/, "")
    .replace(/Tier$/, "");
  const spaced = trimmed
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
  return spaced.replace(/\s+/g, " ");
}

/**
 * Builds the equipment list from the fields of a loaded profile.
 *
 * Items are discovered from the save file itself, which keeps the dashboard
 * correct across game updates.
 */
export function buildEquipment(profile: SaveProfile): EquipmentEntry[] {
  const ints = new Map(profile.ints.map((field) => [field.key, field.value]));
  const bools = new Map(profile.bools.map((field) => [field.key, field.value]));

  const bases = new Set<string>();

  for (const key of ints.keys()) {
    const inventory = key.match(/^(.+?)Inventory$/);
    if (inventory) {
      bases.add(inventory[1]);
      continue;
    }
    // `<Item>0Tier` and `<Item>-1Tier` are the per tier ownership counters.
    const slot = key.match(/^(.+?)(-?[01])Tier$/);
    if (slot) {
      bases.add(slot[1]);
      continue;
    }
    const tier = key.match(/^(.+?)Tier$/);
    if (tier) bases.add(tier[1]);
  }

  for (const key of bools.keys()) {
    const unlock = key.match(/^(.+?)TierOneUnlockOwned$/);
    if (unlock) bases.add(unlock[1]);
  }

  const entries: EquipmentEntry[] = [];

  for (const base of bases) {
    const meta = GEAR_CATALOGUE[base];
    const inventoryKey = `${base}Inventory`;
    const tierKey = `${base}Tier`;
    const unlockKey = `${base}TierOneUnlockOwned`;

    const tierSlots: EquipmentEntry["tierSlots"] = [];
    for (const suffix of TIER_SLOT_SUFFIXES) {
      const slotKey = `${base}${suffix}`;
      if (ints.has(slotKey)) {
        tierSlots.push({
          key: slotKey,
          tier: TIER_SLOT_TIER[suffix] ?? 1,
          value: ints.get(slotKey) ?? 0,
        });
      }
    }

    entries.push({
      base,
      label: meta?.label ?? prettifyKey(base),
      category: meta?.category ?? "tool",
      blurb: meta?.blurb ?? "Part of your ghost hunting kit.",
      inventoryKey: ints.has(inventoryKey) ? inventoryKey : null,
      inventory: ints.get(inventoryKey) ?? 0,
      tierKey: ints.has(tierKey) ? tierKey : null,
      tier: ints.get(tierKey) ?? 0,
      unlockKey: bools.has(unlockKey) ? unlockKey : null,
      unlocked: bools.get(unlockKey) ?? false,
      tierSlots,
    });
  }

  const order = new Map(CATEGORY_ORDER.map((category, index) => [category, index]));
  entries.sort((a, b) => {
    const categoryDiff = (order.get(a.category) ?? 9) - (order.get(b.category) ?? 9);
    if (categoryDiff !== 0) return categoryDiff;
    return a.label.localeCompare(b.label);
  });

  return entries;
}

/** Groups equipment entries by category, keeping the configured order. */
export function groupByCategory(
  entries: EquipmentEntry[],
): { category: GearCategory; items: EquipmentEntry[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: entries.filter((entry) => entry.category === category),
  })).filter((group) => group.items.length > 0);
}

/** Human readable label for a category. */
export const CATEGORY_LABEL: Record<GearCategory, string> = {
  gear: "Ghost hunting gear",
  tool: "Tools",
  consumable: "Consumables",
  cosmetic: "Cosmetics",
};
