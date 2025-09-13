import express from "express";
import cors from "cors";
import { registerRoutes } from "./core/routes.js";
import { seedCommercialAreas } from "./core/seed-areas.js";

const app = express();

// W3 Suite backend standalone - senza Brand Interface

// CORS configuration - accept requests from frontend (3000) and reverse proxy (5000)
app.use(cors({
  origin: [
    'http://localhost:3000',  // W3 Suite frontend
    'http://localhost:5000',  // Reverse proxy
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Demo-User', 'X-Auth-Session']
}));

app.use(express.json());

// Seed dati di riferimento
await seedCommercialAreas();

// Crea il server HTTP
const httpServer = await registerRoutes(app);

// W3 Suite backend cleanup
process.on("SIGTERM", () => {
  console.log("🚫 W3 Suite backend shutting down");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🚫 W3 Suite backend shutting down");
  process.exit(0);
});

// Fixed port for W3 Backend - using 5000 for Replit compatibility
const port = parseInt(process.env.W3_BACKEND_PORT || '5000', 10);

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`🚀 W3 Suite backend running on fixed port ${port}`);
  console.log(`🔌 API available at: http://localhost:${port}/api`);
  console.log(`🔍 Health check: http://localhost:${port}/api/tenants`);
});