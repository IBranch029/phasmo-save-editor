import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri expects a fixed port and does not want Vite to obscure Rust errors.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "chrome110",
    minify: "esbuild",
    sourcemap: false,
    outDir: "dist",
    emptyOutDir: true,
  },
});
