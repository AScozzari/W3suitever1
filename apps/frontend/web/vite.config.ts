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
    strictPort: true, // Exit if port is not available
    allowedHosts: [
      "990d2e08-e877-47ab-86e4-4ab1ec4a5b18-00-a7zlal1jz3uk.worf.replit.dev",
      "localhost",
      "127.0.0.1"
    ],
    hmr: {
      port: 24678
    },
    proxy: {
      // Proxy API calls to backend server
      '/api': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      // Proxy OAuth2 endpoints to backend server
      '/oauth2': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        secure: false,
      },
      // Proxy .well-known endpoints to backend server
      '/.well-known': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        secure: false,
      }
    }
  },
});