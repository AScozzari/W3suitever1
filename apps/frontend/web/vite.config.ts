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
    port: 3000,
    host: "0.0.0.0",
    allowedHosts: true,
    hmr: {
      protocol: 'wss',      // when served over https (Replit)
      clientPort: 443        // ensure browser connects on 443
    }
  },
});