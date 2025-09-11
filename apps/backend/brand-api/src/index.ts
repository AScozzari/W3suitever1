import express from "express";
import { registerBrandRoutes } from "./core/routes.js";

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

  // Crea il server HTTP per Brand Interface API (solo backend)
  const httpServer = await registerBrandRoutes(app);

  // Event handlers per il server HTTP
  httpServer.on('error', (error) => {
    console.error('❌ Brand Interface server error:', error);
  });

  httpServer.on('close', () => {
    console.log('🚫 Brand Interface server closed');
  });

  // Avvia il server Brand API sulla porta 5002
  httpServer.listen(5002, "0.0.0.0", () => {
    console.log("✅ Brand Interface API server running on port 5002");
    console.log("🌐 Brand Interface API available at: http://localhost:5002");
  });

} catch (error) {
  console.error('❌ Brand Interface startup failed:', error);
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
}