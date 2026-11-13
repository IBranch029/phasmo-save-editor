import { motion } from "framer-motion";
import { Banknote, Plus, RotateCcw, TrendingUp } from "lucide-react";

import { formatNumber } from "../lib/format";
import { MAX_MONEY } from "../lib/catalog";
import { AnimatedNumber } from "./AnimatedNumber";
import { Card } from "./Card";
import { NumberField, Slider } from "./Controls";

export interface MoneyCardProps {
  value: number;
  original: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/** The wallet card: balance, quick presets and a fine tuned slider. */
export function MoneyCard({ value, original, onChange, disabled }: MoneyCardProps) {
  const delta = value - original;
  const dirty = delta !== 0;

  const presets: { label: string; amount: number; title: string }[] = [
    { label: "+10 000", amount: 10_000, title: "Add ten thousand" },
    { label: "+100 000", amount: 100_000, title: "Add one hundred thousand" },
    { label: "Max", amount: MAX_MONEY, title: "Fill the wallet to the limit" },
  ];

  return (
    <Card
      icon={Banknote}
      title="Money"
      subtitle="PlayersMoney"
      accent="ember"
      delay={0.05}
      actions={
        dirty ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="chip chip-warn"
          >
            <TrendingUp size={11} />
            {delta > 0 ? "+" : ""}
            {formatNumber(delta)}
          </motion.span>
        ) : null
      }
    >
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Balance</p>
          <p className="mt-1 truncate font-mono text-[2rem] font-semibold leading-none tracking-tight text-emberBright">
            <AnimatedNumber value={value} />
          </p>
        </div>

        <div className="w-40 shrink-0">
          <NumberField
            value={value}
            onCommit={onChange}
            min={0}
            max={MAX_MONEY}
            disabled={disabled}
            ariaLabel="Money"
          />
        </div>
      </div>

      <div className="mt-4">
        <Slider
          value={value}
          min={0}
          max={MAX_MONEY}
          step={500}
          onChange={onChange}
          disabled={disabled}
          label="Money"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="btn"
            title={preset.title}
            disabled={disabled}
            onClick={() => onChange(Math.min(MAX_MONEY, value + preset.amount))}
          >
            <Plus size={12} />
            {preset.label}
          </button>
        ))}

        <button
          type="button"
          className="btn btn-ghost"
          disabled={disabled || !dirty}
          onClick={() => onChange(original)}
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>
    </Card>
  );
}
