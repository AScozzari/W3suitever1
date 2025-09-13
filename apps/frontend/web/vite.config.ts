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
    },
  },
  server: {
    port: 3006,  // Changed from 3000 to 3006 for cache bypass
    host: "127.0.0.1",  // localhost only for security
    strictPort: true,
    allowedHosts: true,
    hmr: {
      protocol: 'wss',      // when served over https (Replit)
      clientPort: 443        // ensure browser connects on 443
    }
  },
});