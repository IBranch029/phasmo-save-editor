/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#04050a",
          900: "#07090d",
          850: "#0b0e13",
          800: "#10141a",
          750: "#141922",
          700: "#1a202a",
          600: "#232a35",
          500: "#2f3745",
        },
        bone: {
          DEFAULT: "#e9e4d6",
          dim: "#a7a294",
          faint: "#6b6a62",
        },
        ember: "#e59a45",
        emberBright: "#ffd9a8",
        emberDeep: "#9d5f22",
        spirit: "#57d4bf",
        spiritBright: "#b6f4e7",
        spiritDeep: "#268b7d",
        rust: "#d8564b",
        rustBright: "#f5a49b",
        rustDeep: "#b23d34",
        moss: "#8fbf6a",
        mossDeep: "#74a352",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Segoe UI Variable Text",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Cascadia Mono",
          "Consolas",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      boxShadow: {
        panel:
          "0 24px 60px -30px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.035)",
        "inner-top": "inset 0 1px 0 rgba(255,255,255,0.05)",
        ember:
          "0 0 0 1px rgba(229,154,69,0.30), 0 0 26px -8px rgba(229,154,69,0.55)",
        "ember-lg":
          "0 0 0 1px rgba(229,154,69,0.45), 0 0 44px -10px rgba(229,154,69,0.70)",
        spirit:
          "0 0 0 1px rgba(87,212,191,0.28), 0 0 26px -10px rgba(87,212,191,0.50)",
        inset: "inset 0 2px 6px rgba(0,0,0,0.55)",
      },
      letterSpacing: {
        wider2: "0.18em",
        wider3: "0.28em",
      },
      keyframes: {
        flicker: {
          "0%, 100%": { opacity: "0.055" },
          "8%": { opacity: "0.02" },
          "12%": { opacity: "0.075" },
          "18%": { opacity: "0.03" },
          "24%": { opacity: "0.06" },
          "37%": { opacity: "0.025" },
          "52%": { opacity: "0.07" },
          "70%": { opacity: "0.035" },
          "86%": { opacity: "0.06" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.35", filter: "blur(38px)" },
          "50%": { opacity: "0.62", filter: "blur(52px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 1px rgba(229,154,69,0.25), 0 0 18px -8px rgba(229,154,69,0.45)" },
          "50%": { boxShadow: "0 0 0 1px rgba(229,154,69,0.45), 0 0 30px -6px rgba(229,154,69,0.75)" },
        },
        spinSlow: {
          to: { transform: "rotate(360deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        flicker: "flicker 7s linear infinite",
        scanline: "scanline 9s linear infinite",
        breathe: "breathe 6s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2.8s ease-in-out infinite",
        "spin-slow": "spinSlow 3.5s linear infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};
