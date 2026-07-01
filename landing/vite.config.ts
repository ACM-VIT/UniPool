import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Vite config. SPA mode (react-router handles routing). Tailwind v4
// runs as a first-class Vite plugin — no postcss.config needed, no
// content-glob to maintain (the plugin scans imported sources). The
// `.well-known` JSON files for deep linking live in `public/.well-known`
// and Vite serves them at their root paths in dev and copies them
// verbatim into the build output. No `appType: "spa"` line needed —
// that's the default.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  preview: {
    port: 4173,
  },
});
