import express from "express";
import { registerBrandRoutes } from "./core/routes.js";
import { setupBrandVite } from "./core/vite.js";

console.log("🚀 Starting Brand Interface Server...");

// Error handling per mantenere il processo attivo in development
process.on('uncaughtException', (error) => {
  console.error('❌ Brand Interface uncaught exception:', error);
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Brand Interface unhandled rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});

try {
  const app = express();
  app.use(express.json());

  // Crea il server HTTP per Brand Interface
  const httpServer = await registerBrandRoutes(app);

  // Setup Vite per servire brand-web frontend in development
  if (process.env.NODE_ENV === "development") {
    await setupBrandVite(app, httpServer);
  }

  // Event handlers per il server HTTP
  httpServer.on('error', (error) => {
    console.error('❌ Brand Interface server error:', error);
  });

  httpServer.on('close', () => {
    console.log('🚫 Brand Interface server closed');
  });

  // Avvia il server Brand sulla porta 5001
  httpServer.listen(5001, "0.0.0.0", () => {
    console.log("✅ Brand Interface server running on port 5001");
    console.log("🌐 Brand Interface available at: http://localhost:5001");
  });

} catch (error) {
  console.error('❌ Brand Interface startup failed:', error);
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
}