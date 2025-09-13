import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./core/routes.js";
import { seedCommercialAreas } from "./core/seed-areas.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Start backend directly - no reverse proxy
startBackend();

async function startBackend() {
  const app = express();

  // W3 Suite backend standalone

  // CORS configuration - accept requests from frontend only
  app.use(cors({
    origin: [
      'http://localhost:3000',  // W3 Suite frontend
      'http://127.0.0.1:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Demo-User', 'X-Auth-Session']
  }));

  app.use(express.json());

  // Serve static files from public directory
  const publicPath = path.join(__dirname, "../../../../public");
  app.use(express.static(publicPath));

  // Seed dati di riferimento
  await seedCommercialAreas();

  // Crea il server HTTP
  const httpServer = await registerRoutes(app);

  // API-only backend - frontend apps handle their own routing
  // Only serve API, OAuth2, and well-known endpoints

  // W3 Suite backend cleanup
  process.on("SIGTERM", () => {
    console.log("🚫 W3 Suite backend shutting down");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("🚫 W3 Suite backend shutting down");
    process.exit(0);
  });

  // W3 Suite backend on dedicated port 3004
  const port = parseInt(process.env.W3_BACKEND_PORT || '3004', 10);

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`🚀 W3 Suite backend running on fixed port ${port}`);
    console.log(`🔌 API available at: http://localhost:${port}/api`);
    console.log(`🔍 Health check: http://localhost:${port}/api/tenants`);
  });
}