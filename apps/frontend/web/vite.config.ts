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
  // 🚀 PERFORMANCE: Build optimization with manual chunk splitting
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core - loaded first, cached long-term
          'react-core': ['react', 'react-dom', 'wouter'],
          
          // Radix UI - shared across all pages
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-switch',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
          ],
          
          // State management & data fetching
          'query': ['@tanstack/react-query'],
          
          // Heavy UI libraries - split separately
          'calendar': ['@fullcalendar/core', '@fullcalendar/react', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/list', '@fullcalendar/interaction'],
          'flow': ['@xyflow/react'],
          
          // Icons
          'icons': ['lucide-react', 'react-icons'],
          
          // Form libraries
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
    // Code splitting & minification
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild',
    // Source maps for debugging
    sourcemap: false, // Disable in production for smaller bundle
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
      clientPort: 443,
      protocol: 'wss'
    },
    // Proxy API requests to backend during development
    // In production, nginx handles this routing
    proxy: {
      '/api': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});