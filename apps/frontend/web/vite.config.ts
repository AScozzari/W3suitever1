import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@w3suite/frontend-kit": path.resolve(__dirname, "../../../packages/frontend-kit"),
    },
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    strictPort: true, // Exit if port is not available
    allowedHosts: [
      "990d2e08-e877-47ab-86e4-4ab1ec4a5b18-00-a7zlal1jz3uk.worf.replit.dev",
      "localhost",
      "127.0.0.1"
    ],
    hmr: {
      port: 24678
    },
    // Removed proxy configuration since nginx handles API routing
    // When frontend is served through nginx on port 5000, 
    // nginx proxies /api/* to backend on localhost:3004
  },
});