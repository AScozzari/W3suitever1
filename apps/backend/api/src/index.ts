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

// Trova una porta libera per il W3 Backend
const preferredPort = parseInt(process.env.W3_BACKEND_PORT || '3004', 10);
const alternativePorts = [3004, 3011, 3012, 3013];

let port = preferredPort;

// Check if preferred port is available, otherwise try alternatives
const net = await import('net');

const checkPort = (portToCheck: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(portToCheck, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
};

for (const tryPort of alternativePorts) {
  const isAvailable = await checkPort(tryPort);
  if (isAvailable) {
    port = tryPort;
    console.log(`✅ Using port ${port} for W3 Backend`);
    break;
  }
}

httpServer.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use. Please free the port and restart.`);
    console.error('💡 Try: pkill -f "tsx" && ./start-enterprise.sh');
    process.exit(1);
  } else {
    console.error('❌ W3 Suite backend server error:', error);
    throw error;
  }
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`🚀 W3 Suite backend running on port ${port}`);
  console.log(`🔌 API available at: http://localhost:${port}/api`);
  console.log(`🔍 Health check: http://localhost:${port}/api/tenants`);
});