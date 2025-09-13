import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/brandinterface/',
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "src"),
      "@ui": path.resolve(dirname, "..", "..", "..", "packages", "ui", "src"),
      "@tokens": path.resolve(dirname, "..", "..", "..", "packages", "tokens"),
      "@sdk": path.resolve(dirname, "..", "..", "..", "packages", "sdk"),
    },
  },
  server: {
    // Brand Frontend runs on unmapped port (localhost only)
    port: 35556,
    host: '127.0.0.1',
    strictPort: true,
    allowedHosts: true,
    hmr: {
      protocol: 'wss',
      clientPort: 443,
      host: 'localhost'
    }
  },
  preview: {
    port: 35556,
    host: '127.0.0.1'
  }
});