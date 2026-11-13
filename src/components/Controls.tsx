import { useEffect, useState } from "react";

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
}

/** A tactile, glowing range slider. */
export function Slider({ value, min, max, step = 1, onChange, disabled, label }: SliderProps) {
  const span = max - min;
  const fill = span > 0 ? ((value - min) / span) * 100 : 0;

  return (
    <input
      type="range"
      className="slider"
      style={{ ["--fill" as string]: `${Math.min(Math.max(fill, 0), 100)}%` }}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}

export interface NumberFieldProps {
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * A numeric text field that keeps the raw text while it is being edited and
 * only commits a valid number when the user leaves the field or presses Enter.
 */
export function NumberField({
  value,
  onCommit,
  min,
  max,
  disabled,
  placeholder,
  className = "",
  ariaLabel,
}: NumberFieldProps) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  // Keep the field in sync when the value changes from the outside.
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const commit = () => {
    setFocused(false);
    const parsed = Number(text.trim());
    if (!Number.isFinite(parsed)) {
      setText(String(value));
      return;
    }
    let next = Math.trunc(parsed);
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    setText(String(next));
    if (next !== value) onCommit(next);
  };

  const invalid = focused && text.trim() !== "" && !Number.isFinite(Number(text.trim()));

  return (
    <input
      type="text"
      inputMode="numeric"
      className={`field ${invalid ? "field-invalid" : ""} ${className}`}
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      onFocus={() => setFocused(true)}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          setText(String(value));
          setFocused(false);
          event.currentTarget.blur();
        }
      }}
    />
  );
}
