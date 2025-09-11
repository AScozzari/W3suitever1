import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: '/brandinterface/',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@ui": path.resolve(import.meta.dirname, "..", "..", "packages", "ui", "src"),
      "@tokens": path.resolve(import.meta.dirname, "..", "..", "packages", "tokens"),
      "@sdk": path.resolve(import.meta.dirname, "..", "..", "packages", "sdk"),
    },
  },
});