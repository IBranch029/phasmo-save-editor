import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

import { formatNumber } from "../lib/format";

export interface AnimatedNumberProps {
  value: number;
  className?: string;
  format?: (value: number) => string;
}

/** A number that eases into its new value instead of snapping. */
export function AnimatedNumber({ value, className, format = formatNumber }: AnimatedNumberProps) {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { stiffness: 140, damping: 22, mass: 0.6 });
  const display = useTransform(spring, (latest) => format(latest));

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  return <motion.span className={className}>{display}</motion.span>;
}
