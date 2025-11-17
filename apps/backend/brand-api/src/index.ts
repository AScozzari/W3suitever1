import express from "express";
import cors from "cors";
import { registerBrandRoutes } from "./core/routes.js";

console.log("🚀 Starting Brand API Server...");

// Error handling per mantenere il processo attivo in development
process.on('uncaughtException', (error) => {
  console.error('❌ Brand API uncaught exception:', error);
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Brand API unhandled rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});

try {
  const app = express();
  
  // CORS configuration for Brand API - Allow Frontend
  app.use(cors({
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  app.use(express.json({ limit: '50mb' })); // Increased to 50MB to support large payloads (price lists, products)

  // Crea il server HTTP per Brand API
  const httpServer = await registerBrandRoutes(app);

  // Event handlers per il server HTTP
  httpServer.on('error', (error) => {
    console.error('❌ Brand API server error:', error);
  });

  httpServer.on('close', () => {
    console.log('🚫 Brand API server closed');
  });

  // Fixed port for Brand Backend
  const port = parseInt(process.env.BRAND_BACKEND_PORT || '3002', 10);
  
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`✅ Brand API server running on fixed port ${port}`);
    console.log(`🔌 Brand API available at: http://localhost:${port}/brand-api/health`);
  });

} catch (error) {
  console.error('❌ Brand API startup failed:', error);
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
}

