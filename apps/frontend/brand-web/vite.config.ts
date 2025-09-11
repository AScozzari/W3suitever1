import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/brandinterface/',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "src"),
      "@ui": path.resolve(dirname, "..", "..", "..", "packages", "ui", "src"),
      "@tokens": path.resolve(dirname, "..", "..", "..", "packages", "tokens"),
      "@sdk": path.resolve(dirname, "..", "..", "..", "packages", "sdk"),
    },
  },
  server: {
    // Configurazione per ambiente Replit
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true
  },
  preview: {
    host: '0.0.0.0',
    port: 5000
  }
});