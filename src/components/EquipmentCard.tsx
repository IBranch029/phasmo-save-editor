import { motion } from "framer-motion";
import { PackageSearch, Search, Unlock, X } from "lucide-react";
import { useMemo, useState } from "react";

import {
  CATEGORY_LABEL,
  buildEquipment,
  groupByCategory,
  type GearCategory,
} from "../lib/catalog";
import type { SaveProfile } from "../types";
import { Card } from "./Card";
import { EquipmentRow } from "./EquipmentRow";

export interface EquipmentCardProps {
  profile: SaveProfile;
  values: Record<string, number | boolean>;
  onFieldChange: (key: string, value: number | boolean) => void;
  disabled?: boolean;
}

type Filter = "all" | GearCategory;

/** The equipment panel: every item in the profile with quantity and tier. */
export function EquipmentCard({ profile, values, onFieldChange, disabled }: EquipmentCardProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const entries = useMemo(() => buildEquipment(profile), [profile]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (filter !== "all" && entry.category !== filter) return false;
      if (!needle) return true;
      return (
        entry.label.toLowerCase().includes(needle) ||
        entry.base.toLowerCase().includes(needle)
      );
    });
  }, [entries, filter, query]);

  const groups = useMemo(() => groupByCategory(visible), [visible]);

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    ...groupByCategory(entries).map((group) => ({
      id: group.category,
      label: CATEGORY_LABEL[group.category],
    })),
  ];

  const unlockAll = () => {
    for (const entry of entries) {
      if (!entry.unlockKey) continue;
      onFieldChange(entry.unlockKey, true);
    }
  };

  return (
    <Card
      icon={PackageSearch}
      title="Equipment"
      subtitle={`${entries.length} items · inventory, tiers and unlocks`}
      accent="ember"
      delay={0.2}
      actions={
        <button type="button" className="btn px-2.5 py-1.5 text-[10px]" onClick={unlockAll} disabled={disabled}>
          <Unlock size={11} />
          Unlock all
        </button>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[13rem] flex-1">
          <Search
            size={13}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bone/30"
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search equipment..."
            className="field pl-8 pr-8"
            aria-label="Search equipment"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-bone/35 transition hover:text-bone"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider2 transition ${
                filter === item.id
                  ? "border-ember/45 bg-ember/12 text-emberBright"
                  : "border-white/10 bg-white/[0.03] text-bone/45 hover:border-white/20 hover:text-bone/70"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="mt-4 space-y-5">
        {groups.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-bone/30">
            No equipment matches “{query}”.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.category}>
              <div className="mb-2 flex items-center gap-3">
                <span className="eyebrow">{CATEGORY_LABEL[group.category]}</span>
                <span className="h-px flex-1 bg-white/[0.07]" />
                <span className="text-[10px] text-bone/25">{group.items.length}</span>
              </div>

              <div className="grid gap-2">
                {group.items.map((entry) => (
                  <motion.div
                    key={entry.base}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <EquipmentRow
                      entry={entry}
                      inventory={Number(values[entry.inventoryKey ?? ""] ?? entry.inventory)}
                      tier={Number(values[entry.tierKey ?? ""] ?? entry.tier)}
                      unlocked={Boolean(values[entry.unlockKey ?? ""] ?? entry.unlocked)}
                      onFieldChange={onFieldChange}
                      disabled={disabled}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
