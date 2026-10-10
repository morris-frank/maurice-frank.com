import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Builds into the deployed folder next to the plates; fixed names so a rebuild overwrites in place.
export default defineConfig(({ command }) => ({
  base: "./",
  plugins: [react()],
  // The dev server serves the plates from the deployed folder.
  publicDir: command === "serve" ? "../../artifacts/drift" : false,
  server: { port: 5199 },
  build: {
    outDir: "../../artifacts/drift",
    emptyOutDir: false,
    rollupOptions: { output: { entryFileNames: "drift.js", assetFileNames: "drift.[ext]" } },
  },
}));
