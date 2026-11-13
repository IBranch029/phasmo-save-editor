import { motion } from "framer-motion";
import { Crown, RotateCcw, TrendingUp } from "lucide-react";

import { MAX_PRESTIGE } from "../lib/catalog";
import { formatNumber } from "../lib/format";
import { Card } from "./Card";
import { NumberField, Slider } from "./Controls";

export interface PrestigeCardProps {
  prestige: number;
  original: number;
  rewardMultiplier: number | null;
  prestigeTheme: boolean;
  onPrestigeChange: (value: number) => void;
  onPrestigeThemeChange: (value: boolean) => void;
  disabled?: boolean;
}

/** The prestige card: prestige level, reward multiplier and the theme flag. */
export function PrestigeCard({
  prestige,
  original,
  rewardMultiplier,
  prestigeTheme,
  onPrestigeChange,
  onPrestigeThemeChange,
  disabled,
}: PrestigeCardProps) {
  const dirty = prestige !== original;
  const presets = [0, 5, 25, 100];

  return (
    <Card
      icon={Crown}
      title="Prestige"
      subtitle="PrestigeIndex · RewardMultiplier"
      accent="moss"
      delay={0.15}
      actions={
        dirty ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="chip chip-warn"
          >
            <TrendingUp size={11} />
            {prestige > original ? "+" : ""}
            {formatNumber(prestige - original)}
          </motion.span>
        ) : null
      }
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Prestige level</p>
          <p className="mt-1 font-mono text-[2rem] font-semibold leading-none tracking-tight text-moss">
            {formatNumber(prestige)}
          </p>
        </div>

        <div className="w-40 shrink-0">
          <NumberField
            value={prestige}
            onCommit={onPrestigeChange}
            min={0}
            max={MAX_PRESTIGE}
            disabled={disabled}
            ariaLabel="Prestige level"
            className="text-lg"
          />
        </div>
      </div>

      <div className="mt-4">
        <Slider
          value={prestige}
          min={0}
          max={MAX_PRESTIGE}
          onChange={onPrestigeChange}
          disabled={disabled}
          label="Prestige level"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className="btn px-2.5 py-1.5 text-[10px]"
            disabled={disabled}
            onClick={() => onPrestigeChange(preset)}
          >
            {preset}
          </button>
        ))}
        <button
          type="button"
          className="btn px-2.5 py-1.5 text-[10px]"
          disabled={disabled}
          onClick={() => onPrestigeChange(MAX_PRESTIGE)}
        >
          Max
        </button>
        <button
          type="button"
          className="btn btn-ghost px-2.5 py-1.5 text-[10px]"
          disabled={disabled || !dirty}
          onClick={() => onPrestigeChange(original)}
        >
          <RotateCcw size={11} />
          Reset
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4">
        <div>
          <p className="eyebrow">Reward multiplier</p>
          <p className="mt-1 font-mono text-base text-bone/80">
            {rewardMultiplier === null ? "—" : `x${rewardMultiplier}`}
          </p>
        </div>

        <div>
          <p className="eyebrow">Prestige theme</p>
          <button
            type="button"
            role="switch"
            aria-checked={prestigeTheme}
            disabled={disabled}
            onClick={() => onPrestigeThemeChange(!prestigeTheme)}
            className={`mt-1 flex h-8 items-center gap-2 rounded-lg border px-2.5 text-[11px] font-semibold uppercase tracking-wider2 transition ${
              prestigeTheme
                ? "border-moss/40 bg-moss/10 text-moss"
                : "border-white/10 bg-white/[0.03] text-bone/45"
            }`}
          >
            <span
              className={`h-3.5 w-3.5 rounded-full ${prestigeTheme ? "bg-moss" : "bg-bone/25"}`}
            />
            {prestigeTheme ? "Unlocked" : "Locked"}
          </button>
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-bone/30">
        The game unlocks prestige once a profile reaches the required level. Pushing the
        prestige index higher raises every reward that is granted afterwards.
      </p>
    </Card>
  );
}
