import { motion } from "framer-motion";
import { GraduationCap, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { MAX_LEVEL } from "../lib/catalog";
import { formatNumber, formatPercent } from "../lib/format";
import { Card } from "./Card";
import { NumberField, Slider } from "./Controls";

/**
 * The XP the game asks for on level 13, taken from the in-game ID card.
 * The requirement grows with the level, so it stays editable.
 */
const DEFAULT_XP_REQUIREMENT = 1094;
const STORAGE_KEY = "phasmosave.xpRequirement";

export interface LevelCardProps {
  level: number;
  originalLevel: number;
  experience: number;
  originalExperience: number;
  onLevelChange: (value: number) => void;
  onExperienceChange: (value: number) => void;
  disabled?: boolean;
}

/** The level and experience card, including the XP calculator. */
export function LevelCard({
  level,
  originalLevel,
  experience,
  originalExperience,
  onLevelChange,
  onExperienceChange,
  disabled,
}: LevelCardProps) {
  const [requirement, setRequirement] = useState<number>(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? Number(stored) : NaN;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_XP_REQUIREMENT;
    } catch {
      return DEFAULT_XP_REQUIREMENT;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(requirement));
    } catch {
      /* storage is optional */
    }
  }, [requirement]);

  const progress = requirement > 0 ? experience / requirement : 0;
  const remaining = Math.max(0, requirement - experience);
  const dirty = level !== originalLevel || experience !== originalExperience;
  const levelPresets = [20, 50, 100, MAX_LEVEL];


  return (
    <Card
      icon={GraduationCap}
      title="Level & Experience"
      subtitle="NewLevel · Experience"
      accent="spirit"
      delay={0.1}
      actions={
        dirty ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="chip chip-warn"
          >
            <TrendingUp size={11} />
            Modified
          </motion.span>
        ) : null
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Level */}
        <div>
          <label className="eyebrow" htmlFor="level-input">
            Player level
          </label>
          <div className="mt-2">
            <NumberField
              value={level}
              onCommit={onLevelChange}
              min={1}
              max={MAX_LEVEL}
              disabled={disabled}
              ariaLabel="Player level"
              className="text-lg"
            />
          </div>

          <div className="mt-3">
            <Slider
              value={level}
              min={1}
              max={MAX_LEVEL}
              onChange={onLevelChange}
              disabled={disabled}
              label="Player level"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {levelPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                className="btn px-2.5 py-1.5 text-[10px]"
                disabled={disabled}
                onClick={() => onLevelChange(preset)}
              >
                {preset === MAX_LEVEL ? "Max" : preset}
              </button>
            ))}
          </div>
        </div>


        {/* Experience */}
        <div>
          <label className="eyebrow" htmlFor="xp-input">
            Experience in this level
          </label>
          <div className="mt-2">
            <NumberField
              value={experience}
              onCommit={onExperienceChange}
              min={0}
              disabled={disabled}
              ariaLabel="Experience"
              className="text-lg"
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-spirit/70 to-spirit"
                animate={{ width: `${Math.min(Math.max(progress, 0), 1) * 100}%` }}
                transition={{ type: "spring", stiffness: 180, damping: 26 }}
              />
            </div>
            <span className="value-mono w-20 shrink-0 text-right text-[11px] text-bone/50">
              {formatNumber(experience)} / {formatNumber(requirement)}
            </span>
          </div>

          <p className="mt-2 text-[11px] text-bone/35">
            {remaining > 0
              ? `${formatNumber(remaining)} XP left to level up`
              : "Level up ready"}
            {" · "}
            {formatPercent(progress)}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <span className="eyebrow whitespace-nowrap">Need</span>
            <div className="w-28">
              <NumberField
                value={requirement}
                onCommit={(value) => setRequirement(Math.max(1, value))}
                min={1}
                ariaLabel="XP required for the next level"
              />
            </div>
            <span className="text-[10px] leading-tight text-bone/30">
              XP the game asks
              <br />
              for this level
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              className="btn px-2.5 py-1.5 text-[10px]"
              disabled={disabled}
              onClick={() => onExperienceChange(requirement)}
            >
              <Sparkles size={11} />
              Complete level
            </button>
            <button
              type="button"
              className="btn px-2.5 py-1.5 text-[10px]"
              disabled={disabled}
              onClick={() => onExperienceChange(0)}
            >
              Reset XP
            </button>
            <button
              type="button"
              className="btn px-2.5 py-1.5 text-[10px]"
              disabled={disabled}
              onClick={() => {
                onLevelChange(Math.min(MAX_LEVEL, level + 1));
                onExperienceChange(0);
              }}
            >
              Level +1
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
