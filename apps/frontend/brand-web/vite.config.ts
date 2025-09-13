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
    host: '0.0.0.0',
    port: 3001,
    strictPort: true,
    allowedHosts: [
      "990d2e08-e877-47ab-86e4-4ab1ec4a5b18-00-a7zlal1jz3uk.worf.replit.dev",
      "localhost",
      "127.0.0.1"
    ],
    // HMR configuration for reverse proxy compatibility  
    hmr: {
      port: 3001,
      host: 'localhost',
      clientPort: undefined // Use the port from the request URL
    },
    proxy: {
      '/brand-api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 3001
  }
});