import { motion } from "framer-motion";

/**
 * The atmospheric background of the application.
 *
 * Four stacked layers create the late night, candlelit investigation mood:
 * a cold base gradient, two slowly breathing glows, film grain and the CRT
 * scan lines of an old monitor.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,#0d1219_0%,#07090e_45%,#04050a_100%)]" />

      {/* Warm lantern glow, bottom left */}
      <motion.div
        className="absolute -left-40 bottom-[-18rem] h-[46rem] w-[46rem] rounded-full bg-ember/15 blur-[110px]"
        animate={{ opacity: [0.35, 0.6, 0.4], scale: [1, 1.06, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Cold spirit glow, top right */}
      <motion.div
        className="absolute -right-32 top-[-16rem] h-[38rem] w-[38rem] rounded-full bg-spirit/[0.09] blur-[120px]"
        animate={{ opacity: [0.5, 0.28, 0.5], scale: [1.04, 1, 1.04] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Film grain */}
      <div className="grain absolute inset-0 opacity-[0.035] mix-blend-overlay" />

      {/* CRT scan lines */}
      <div className="crt-scanlines absolute inset-0 opacity-[0.35]" />

      {/* Flicker */}
      <div className="absolute inset-0 animate-flicker bg-white" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(115%_95%_at_50%_45%,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
